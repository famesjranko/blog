import { describe, expect, it } from "vitest";
import type {
	ClickEvent,
	Field,
	StepParticlesOptions,
} from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
const BASE_X = 0.5;
const BASE_Y = -0.25;
const STILL = { x: 0, y: 0, strength: 0 };
const NO_METEORS = { slots: [] };

// Two particles resting at the same base with zero phases.
function makeField(): Field {
	const count = 2;
	const base = new Float32Array(count * 3);
	for (let i = 0; i < count; i += 1) {
		base.set([BASE_X, BASE_Y, 0], i * 3);
	}
	return {
		count,
		palette: [],
		pos: base.slice(),
		alpha: new Float32Array(count),
		col: new Float32Array(count * 3),
		base,
		phase: new Float32Array(count * 2),
		scale: Float32Array.from([0.9, 1.8]),
	};
}

function step(field: Field, hold: number, events: ClickEvent[] = []): void {
	stepWith(field, { hold, events, pointer: STILL, meteors: NO_METEORS });
}

function stepWith(
	field: Field,
	options: Pick<
		StepParticlesOptions,
		"hold" | "events" | "pointer" | "meteors"
	>,
): void {
	stepParticles({
		field,
		aspect: ASPECT,
		time: 0,
		dt: FRAME,
		...options,
	});
}

// At time 0 with zero phases the drift target is
// (base.x * aspect + 0.05 cos 0, base.y + 0.09 cos 0).
const TARGET_X = BASE_X * ASPECT + 0.05;
const TARGET_Y = BASE_Y + 0.09;
const EASE = 1 - Math.exp(-FRAME * 1.1);

describe("stepParticles hold", () => {
	it("eases toward the drift target exactly as before at full hold", () => {
		const field = makeField();
		step(field, 1);
		const x = Math.fround(BASE_X + (TARGET_X - BASE_X) * EASE);
		const y = Math.fround(BASE_Y + (TARGET_Y - BASE_Y) * EASE);
		expect(Array.from(field.pos)).toEqual([x, y, 0, x, y, 0]);
	});

	it("scales the pull toward the drift target by the hold", () => {
		const field = makeField();
		step(field, 0.25);
		const x = Math.fround(BASE_X + (TARGET_X - BASE_X) * EASE * 0.25);
		expect(field.pos[0]).toBeCloseTo(x, 7);
	});

	it("stops pulling particles home at zero hold", () => {
		const field = makeField();
		const before = Array.from(field.pos);
		step(field, 0);
		expect(Array.from(field.pos)).toEqual(before);
	});
});

describe("click force selection", () => {
	const click = { x: 0.3, y: -0.25, age: 0.12, strength: 1 };
	const events: ClickEvent[] = [
		{ ...click, mode: "shockwave" },
		{ ...click, mode: "gravity-implosion" },
		{ ...click, mode: "gravity-slow" },
		{ ...click, mode: "vortex-alternate" },
		{ ...click, mode: "vortex-position" },
		{ ...click, mode: "scatter" },
		{ ...click, mode: "gather" },
		{ ...click, mode: "turbulence" },
	];

	it.each(events)("moves the existing particles for $mode", (event) => {
		// Given a field and its ordinary drift position.
		const field = makeField();
		const ordinary = makeField();
		step(ordinary, 1);

		// When one click in the selected mode is stepped.
		step(field, 1, [event]);

		// Then the selected force changes the field's own position buffer.
		expect(Array.from(field.pos)).not.toEqual(Array.from(ordinary.pos));
	});
});

describe("click force fallback and cost", () => {
	const click = { x: 0.3, y: -0.25, age: 0.12, strength: 1 };
	it("leaves the ordinary field unchanged for off and no click", () => {
		// Given two identical fields.
		const off = makeField();
		const empty = makeField();

		// When off and an empty click list each advance one frame.
		step(off, 1, [{ ...click, mode: "off" }]);
		step(empty, 1);

		// Then both fields have the same ordinary drift positions.
		expect(Array.from(off.pos)).toEqual(Array.from(empty.pos));
	});

	it("limits each particle to the three most recent click events", () => {
		// Given a force followed by three off events.
		const crowded = makeField();
		const ordinary = makeField();
		const events: ClickEvent[] = [
			{ ...click, mode: "gravity-implosion" },
			...Array.from({ length: 3 }, () => ({ ...click, mode: "off" as const })),
		];

		// When both fields advance one frame.
		step(crowded, 1, events);
		step(ordinary, 1);

		// Then the stale fourth event does not affect the field.
		expect(Array.from(crowded.pos)).toEqual(Array.from(ordinary.pos));
	});

	it("applies all three recent click events", () => {
		// Given two identical fields and three active gravity clicks.
		const three = makeField();
		const two = makeField();
		const event: ClickEvent = { ...click, mode: "gravity-implosion" };

		// When one field receives three clicks and the other receives two.
		step(three, 1, [event, event, event]);
		step(two, 1, [event, event]);

		// Then the third recent click also moves the existing particles.
		expect(Array.from(three.pos)).not.toEqual(Array.from(two.pos));
	});
});

describe("clicks with existing forces", () => {
	it("keeps click, pointer, meteor, and motion hold influences in one step", () => {
		// Given a click and nearby pointer and meteor inputs with reduced hold.
		const click: ClickEvent = {
			x: 0.3,
			y: -0.25,
			age: 0.12,
			strength: 1,
			mode: "gravity-implosion",
		};
		const pointer = { x: 0.3, y: -0.25, strength: 1 };
		const meteors = { slots: [{ active: true, x: 0.4, y: -0.25 }] };
		const shared = { hold: 0.25, pointer, meteors, events: [click] };
		const variants = [
			shared,
			{ ...shared, events: [] },
			{ ...shared, pointer: STILL },
			{ ...shared, meteors: NO_METEORS },
			{ ...shared, hold: 1 },
		];
		const fields = variants.map(() => makeField());

		// When each field advances with one influence removed in turn.
		for (const [index, field] of fields.entries()) {
			const variant = variants[index];
			if (variant === undefined) {
				throw new Error("missing force variant");
			}
			stepWith(field, variant);
		}

		// Then every influence contributes to the combined particle position.
		const combined = fields[0];
		if (combined === undefined) {
			throw new Error("missing combined field");
		}
		for (const field of fields.slice(1)) {
			expect(Array.from(combined.pos)).not.toEqual(Array.from(field.pos));
		}
	});
});
