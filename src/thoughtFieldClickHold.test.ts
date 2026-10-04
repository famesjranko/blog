import { describe, expect, it } from "vitest";
import type {
	HoldClick,
	HoldField,
	HoldForceOptions,
} from "../static/js/thought-field-click-hold.js";
import {
	bloomForce,
	HOLD_TUNING,
	spinForce,
	wellForce,
} from "../static/js/thought-field-click-hold.js";

type Force = (options: HoldForceOptions) => void;

const FRAME = 1 / 60;
const ASPECT = 1.5;
const CX = 0.2;
const CY = -0.1;
const HELD = -1;

const FORCES: [string, Force, number][] = [
	["wellForce", wellForce, HOLD_TUNING.well.life],
	["bloomForce", bloomForce, HOLD_TUNING.bloom.life],
	["spinForce", spinForce, HOLD_TUNING.spin.life],
];

// Particles at these distances from the press, spread round it in angle.
function fieldAt(distances: number[]): HoldField {
	const pos = new Float32Array(distances.length * 3);
	distances.forEach((d, i) => {
		const a = i * 2.1;
		pos.set([CX + d * Math.cos(a), CY + d * Math.sin(a), 0], i * 3);
	});
	return { count: distances.length, pos };
}

function click(timing: Pick<HoldClick, "age" | "released">): HoldClick {
	return { x: CX, y: CY, strength: 1, ...timing };
}

function snapshot(field: HoldField): number[] {
	return Array.from(field.pos);
}

// Frames of the force for `seconds`, the click ageing from `start`.
function run(
	force: Force,
	field: HoldField,
	start: HoldClick,
	seconds: number,
): void {
	const frames = Math.round(seconds / FRAME);
	for (let k = 0; k < frames; k += 1) {
		const now = { ...start, age: start.age + k * FRAME };
		force({ field, click: now, dt: FRAME, aspect: ASPECT });
	}
}

// Summed distance moved, in the radial and tangential directions, by a
// field of particles over a 0.1 s window.
function moved(force: Force, start: HoldClick, window = 0.1) {
	const field = fieldAt([0.15, 0.25, 0.35, 0.45]);
	const before = snapshot(field);
	run(force, field, start, window);
	let radial = 0;
	let tangential = 0;
	let total = 0;
	let signedTangential = 0;
	const signs: number[] = [];
	for (let i = 0; i < field.count; i += 1) {
		const bx = (before[i * 3] ?? 0) - CX;
		const by = (before[i * 3 + 1] ?? 0) - CY;
		const mx = (field.pos[i * 3] ?? 0) - CX - bx;
		const my = (field.pos[i * 3 + 1] ?? 0) - CY - by;
		const d = Math.hypot(bx, by);
		const r = (mx * bx + my * by) / d;
		const t = (my * bx - mx * by) / d;
		radial += Math.abs(r);
		tangential += Math.abs(t);
		signedTangential += t;
		total += Math.hypot(mx, my);
		signs.push(Math.sign(r), Math.sign(t));
	}
	return { radial, tangential, total, signedTangential, signs };
}

describe("hold forces while held", () => {
	it.each(FORCES)(
		"%s grows over the hold and keeps going while held",
		(_name, force) => {
			// Given a held press
			// When the force runs for 0.1 s early, mid and late in the hold
			const early = moved(force, click({ age: 0.1, released: HELD })).total;
			const mid = moved(force, click({ age: 1.5, released: HELD })).total;
			const late = moved(force, click({ age: 3.5, released: HELD })).total;

			// Then it moves more mid-hold than early, and still moves late
			expect(mid).toBeGreaterThan(early);
			expect(late).toBeGreaterThan(0);
		},
	);

	it("well pulls every moved particle toward the press", () => {
		// Given a held press
		// When the well runs for 0.1 s
		const { signs } = moved(wellForce, click({ age: 1.5, released: HELD }));

		// Then every radial move is inward
		const radialSigns = signs.filter((_, i) => i % 2 === 0);
		expect(radialSigns.every((s) => s === -1)).toBe(true);
	});

	it("bloom pushes every moved particle away from the press", () => {
		// Given a held press
		// When the bloom runs for 0.1 s
		const { signs } = moved(bloomForce, click({ age: 1.5, released: HELD }));

		// Then every radial move is outward
		const radialSigns = signs.filter((_, i) => i % 2 === 0);
		expect(radialSigns.every((s) => s === 1)).toBe(true);
	});

	it("spin moves particles mainly around the press, counter-clockwise", () => {
		// Given a held press
		// When the spin runs for 0.1 s
		const m = moved(spinForce, click({ age: 1.5, released: HELD }));

		// Then the tangential move is at least 3x the radial one, with one sign
		expect(m.tangential).toBeGreaterThan(3 * m.radial);
		expect(m.signedTangential).toBeCloseTo(m.tangential, 6);
		expect(m.signedTangential).toBeGreaterThan(0);
	});
});

describe("hold forces after release", () => {
	it.each(FORCES)(
		"%s fades after release and stops once its life has passed",
		(_name, force, life) => {
			// Given a press released after a 3 s hold
			const released = 3;

			// When the force runs just after release and again after its life
			const soon = moved(force, click({ age: released, released })).total;
			const after = moved(
				force,
				click({ age: released + life + FRAME, released }),
			).total;

			// Then it moves at first and nothing at all later
			expect(soon).toBeGreaterThan(1e-3);
			expect(after).toBeCloseTo(0, 6);
		},
	);

	it("well never pushes a particle away from the press after release", () => {
		// Given a press released after a 3 s hold, and particles near it
		const field = fieldAt([0.1, 0.3, 0.5]);
		const released = 3;
		const distance = (i: number) =>
			Math.hypot(
				(field.pos[i * 3] ?? 0) - CX,
				(field.pos[i * 3 + 1] ?? 0) - CY,
			);

		// When the well runs frame by frame through its life
		// Then no particle ends a frame further out than it began
		for (let k = 0; k < 60; k += 1) {
			const before = [0, 1, 2].map(distance);
			run(
				wellForce,
				field,
				click({ age: released + k * FRAME, released }),
				FRAME,
			);
			for (const [i, was] of before.entries()) {
				expect(distance(i)).toBeLessThanOrEqual(was + 1e-6);
			}
		}
	});
});

describe("bloomForce reach", () => {
	it("bloom reaches a far particle only once the hold has widened it", () => {
		// Given a particle 0.45 from the press
		const far = (age: number) => {
			const field = fieldAt([0.45]);
			run(bloomForce, field, click({ age, released: HELD }), 0.1);
			const dx = (field.pos[0] ?? 0) - CX;
			const dy = (field.pos[1] ?? 0) - CY;
			return Math.hypot(dx, dy) - 0.45;
		};

		// When the bloom runs early and after a 2 s hold
		// Then the particle is untouched early and pushed outward later
		expect(far(0.1)).toBeCloseTo(0, 6);
		expect(far(2)).toBeGreaterThan(1e-3);
	});
});
