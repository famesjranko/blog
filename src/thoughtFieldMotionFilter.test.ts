import { describe, expect, it } from "vitest";
import type {
	FilterState,
	FilterTuning,
} from "../static/js/thought-field-motion-filter.js";
import { filterReading } from "../static/js/thought-field-motion-filter.js";
import { SLOSH_TUNING } from "../static/js/thought-field-slosh.js";
import type { Vec2 } from "../static/js/thought-field-vec.js";

const G = 9.81;
const FRAME = 1 / 60;
// Portrait, held upright: the reading points up the screen at 1 g.
const UPRIGHT: Vec2 = { x: 0, y: G };
const TUNING: FilterTuning = {
	deadzone: 0.6,
	tiltLean: 0.25,
	tiltRecenter: 4,
	gravitySmoothing: 0.15,
};
const UNSEEDED: FilterState = {
	seeded: false,
	gravity: { x: 0, y: 0 },
	neutral: { x: 0, y: 0 },
};

function seededWith(sample: Vec2, tuning = TUNING): FilterState {
	const first = filterReading({ state: UNSEEDED, sample, dt: FRAME, tuning });
	return { seeded: true, gravity: first.gravity, neutral: first.neutral };
}

describe("filterReading shake and lean", () => {
	it("reports the shake as the deadzoned reading minus the settled gravity", () => {
		// A (3, 4) jolt over upright is 5 m/s²; the 0.6 deadzone leaves 4.4.
		const filtered = filterReading({
			state: seededWith(UPRIGHT),
			sample: { x: 3, y: G + 4 },
			dt: FRAME,
			tuning: TUNING,
		});
		expect(filtered.shake.x).toBeCloseTo(3 * (4.4 / 5), 12);
		expect(filtered.shake.y).toBeCloseTo(4 * (4.4 / 5), 12);
	});

	it("ignores handling-sized shake at the shipped tuning but not a deliberate shake", () => {
		// Measured on a phone: tilts peak at 2.4 to 5.3 m/s², deliberate shakes 20 to 68.
		const state = seededWith(UPRIGHT, SLOSH_TUNING);
		const shakeOf = (x: number) =>
			filterReading({
				state,
				sample: { x, y: G },
				dt: FRAME,
				tuning: SLOSH_TUNING,
			}).shake;
		expect(shakeOf(5)).toEqual({ x: 0, y: 0 });
		expect(shakeOf(20).x).toBeGreaterThan(10);
	});

	it.each([
		{ edge: "right", sign: 1 },
		{ edge: "left", sign: -1 },
	])("reports a lean toward the lowered $edge edge", ({ sign }) => {
		// That edge lowered 30°: the reading's x is ∓g sin 30°.
		const lowered = { x: -sign * G * 0.5, y: G * Math.cos(Math.PI / 6) };
		const filtered = filterReading({
			state: seededWith(UPRIGHT),
			sample: lowered,
			dt: FRAME,
			tuning: TUNING,
		});
		expect(Math.sign(filtered.lean.x)).toBe(sign);
		expect(Math.abs(filtered.lean.x)).toBeGreaterThan(
			Math.abs(filtered.lean.y),
		);
	});
});
