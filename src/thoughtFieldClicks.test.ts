import { describe, expect, it } from "vitest";
import { CLICK_MODES } from "../static/js/thought-field-click-modes.js";
import type {
	ClickField,
	ClickMode,
} from "../static/js/thought-field-clicks.js";
import { createClicks } from "../static/js/thought-field-clicks.js";
import type { Field } from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
// Scatter's radius in thought-field-click-scatter.js, restated so a
// changed radius fails here.
const RADIUS = 0.3;
const PRESS = { x: 0.2, y: -0.1 };

// Particles at rest on their bases, at known distances from PRESS: two
// inside the radius, two outside it.
const PLACES: ReadonlyArray<readonly [number, number]> = [
	[PRESS.x + 0.1, PRESS.y],
	[PRESS.x - 0.05, PRESS.y + 0.12],
	[PRESS.x + 0.5, PRESS.y],
	[PRESS.x, PRESS.y - 0.6],
];

function makeField(): Field {
	const count = PLACES.length;
	const pos = new Float32Array(count * 3);
	for (const [i, [x, y]] of PLACES.entries()) {
		pos.set([x, y, 0], i * 3);
	}
	return {
		count,
		palette: [],
		pos,
		alpha: new Float32Array(count),
		col: new Float32Array(count * 3),
		base: Float32Array.from(pos, (v, i) => (i % 3 === 0 ? v / ASPECT : v)),
		phase: new Float32Array(count * 2),
		scale: new Float32Array(count).fill(1),
	};
}

function mode(id: string): ClickMode {
	const found = CLICK_MODES.find((entry) => entry.id === id);
	if (found === undefined) {
		throw new Error(`no mode ${id}`);
	}
	return found;
}

// The frame as stepFrame runs it: the particles, then the clicks.
function frame(field: Field, clicks: ClickField | null, time: number): void {
	stepParticles({
		field,
		aspect: ASPECT,
		time,
		dt: FRAME,
		pointer: { x: 0, y: 0, strength: 0 },
		meteors: { slots: [] },
		hold: 1,
	});
	clicks?.step({ field, dt: FRAME, aspect: ASPECT });
}

function distance(field: Field, i: number): number {
	const dx = (field.pos[i * 3] ?? 0) - PRESS.x;
	const dy = (field.pos[i * 3 + 1] ?? 0) - PRESS.y;
	return Math.hypot(dx, dy);
}

function heldMode(): ClickMode {
	return { id: "hold", label: "Hold", hold: true, life: 0.5, force: () => {} };
}

describe("scatter on the first frame", () => {
	it("moves particles inside the radius away from the press", () => {
		// Given a scatter press beside two particles inside the radius
		const clicked = makeField();
		const plain = makeField();
		const clicks = createClicks(mode("scatter"));
		clicks.press(PRESS.x, PRESS.y);

		// When one frame runs with and without the click
		frame(clicked, clicks, 0);
		frame(plain, null, 0);

		// Then both are farther from the press than without it
		expect(distance(plain, 0)).toBeLessThan(RADIUS);
		expect(distance(clicked, 0)).toBeGreaterThan(distance(plain, 0) + 0.005);
		// And so is the second
		expect(distance(clicked, 1)).toBeGreaterThan(distance(plain, 1) + 0.005);
	});

	it("leaves particles outside the radius where they would be", () => {
		// Given a scatter press with two particles beyond its radius
		const clicked = makeField();
		const plain = makeField();
		const clicks = createClicks(mode("scatter"));
		clicks.press(PRESS.x, PRESS.y);

		// When one frame runs with and without the click
		frame(clicked, clicks, 0);
		frame(plain, null, 0);

		// Then those particles are exactly where the plain field puts them
		expect(Array.from(clicked.pos.slice(6))).toEqual(
			Array.from(plain.pos.slice(6)),
		);
	});
});

describe("a click decays back into the normal field", () => {
	it("is gone from the live list once its life has passed", () => {
		// Given a scatter click
		const field = makeField();
		const clicks = createClicks(mode("scatter"));
		clicks.press(PRESS.x, PRESS.y);

		// When frames run for longer than its life
		for (let n = 0; n < 60; n += 1) {
			frame(field, clicks, n * FRAME);
		}

		// Then no click is live
		expect(clicks.live()).toEqual([]);
	});

	it("then steps the field exactly as a field with no clicks", () => {
		// Given a field a scatter click has disturbed and then left
		const field = makeField();
		const clicks = createClicks(mode("scatter"));
		clicks.press(PRESS.x, PRESS.y);
		for (let n = 0; n < 60; n += 1) {
			frame(field, clicks, n * FRAME);
		}
		const twin = { ...field, pos: field.pos.slice() };

		// When one more frame runs with the click source and without it
		frame(field, clicks, 1);
		frame(twin, null, 1);

		// Then the positions are the same
		expect(Array.from(field.pos)).toEqual(Array.from(twin.pos));
	});
});

describe("live click limits", () => {
	it("keeps at most eight, dropping the oldest first", () => {
		// Given a held mode
		const clicks = createClicks(heldMode());

		// When ten presses land
		const serials = Array.from({ length: 10 }, (_, n) => clicks.press(n, 0));

		// Then the last eight are live, in order
		expect(clicks.live().map((click) => click.serial)).toEqual(
			serials.slice(2),
		);
	});

	it("clears every click when the mode changes", () => {
		// Given two held presses
		const clicks = createClicks(heldMode());
		clicks.press(0, 0);
		clicks.press(1, 0);

		// When the mode changes
		clicks.setMode(mode("scatter"));

		// Then no click is live
		expect(clicks.live()).toEqual([]);
	});
});

describe("held presses", () => {
	it("stay held at full strength while the pointer is down", () => {
		// Given a held press
		const clicks = createClicks(heldMode());
		clicks.press(0, 0);

		// When just under four seconds pass
		const field = makeField();
		for (let n = 0; n < 3.9 / 0.05; n += 1) {
			clicks.step({ field, dt: 0.05, aspect: ASPECT });
		}

		// Then the click is still held at strength 1
		expect(clicks.live()).toMatchObject([{ released: -1, strength: 1 }]);
	});

	it("are released after four seconds", () => {
		// Given a held press that is never released
		const clicks = createClicks(heldMode());
		clicks.press(0, 0);

		// When a little over four seconds pass
		const field = makeField();
		for (let n = 0; n < 4.1 / 0.05; n += 1) {
			clicks.step({ field, dt: 0.05, aspect: ASPECT });
		}

		// Then the click has been released and is still live in its life
		const [click] = clicks.live();
		expect(click?.released).toBeGreaterThanOrEqual(4);
		expect(click?.released).toBeLessThan(4.1);
	});
});

describe("released presses", () => {
	it("keep full strength after release and end after the mode's life", () => {
		// Given a held press, released after a second
		const clicks = createClicks(heldMode());
		const serial = clicks.press(0, 0);
		const field = makeField();
		for (let n = 0; n < 20; n += 1) {
			clicks.step({ field, dt: 0.05, aspect: ASPECT });
		}
		clicks.release(serial);

		// When most, then more than all, of the 0.5 s life passes
		for (let n = 0; n < 9; n += 1) {
			clicks.step({ field, dt: 0.05, aspect: ASPECT });
		}
		const late = clicks.live()[0]?.strength;
		for (let n = 0; n < 2; n += 1) {
			clicks.step({ field, dt: 0.05, aspect: ASPECT });
		}

		// Then the engine leaves the fade to the force until the end
		expect(late).toBe(1);
		// And the click is gone once the life has passed
		expect(clicks.live()).toEqual([]);
	});
});
