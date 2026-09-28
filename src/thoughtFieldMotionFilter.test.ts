import { describe, expect, it } from "vitest";
import type {
	FilterState,
	FilterTuning,
} from "../static/js/thought-field-motion-filter.js";
import { GLOBE_TUNING } from "../static/js/thought-field-globe.js";
import {
	filterReading,
	restingFilter,
} from "../static/js/thought-field-motion-filter.js";
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
// Right edge lowered 30°: the reading's x is -g sin 30°.
const RIGHT_DOWN: Vec2 = { x: -G * 0.5, y: G * Math.cos(Math.PI / 6) };

function seededWith(sample: Vec2, tuning = TUNING): FilterState {
	const state = restingFilter();
	const first = filterReading({ state, sample, dt: FRAME, tuning });
	return { seeded: true, gravity: first.gravity, neutral: first.neutral };
}

// The lean after feeding the same reading every frame for SECONDS.
function leanAfter(state: FilterState, sample: Vec2, seconds: number): Vec2 {
	let current = state;
	let lean: Vec2 = { x: 0, y: 0 };
	for (let i = 0; i < Math.round(seconds / FRAME); i += 1) {
		const filtered = filterReading({
			state: current,
			sample,
			dt: FRAME,
			tuning: TUNING,
		});
		const { gravity, neutral } = filtered;
		current = { seeded: true, gravity, neutral };
		lean = filtered.lean;
	}
	return lean;
}

describe("filterReading seeding", () => {
	it("takes the first reading from a tilted phone as gravity and neutral: no shake, no lean", () => {
		const tilted = { x: 3, y: 9 };
		const filtered = filterReading({
			state: restingFilter(),
			sample: tilted,
			dt: FRAME,
			tuning: TUNING,
		});
		expect(filtered.gravity).toEqual(tilted);
		expect(filtered.neutral).toEqual(tilted);
		expect(Math.hypot(filtered.shake.x, filtered.shake.y)).toBe(0);
		expect(Math.hypot(filtered.lean.x, filtered.lean.y)).toBe(0);
	});
});

describe("filterReading without a reading", () => {
	it("reports no shake or lean and keeps what it had settled on", () => {
		const state = seededWith(UPRIGHT);
		const filtered = filterReading({
			state,
			sample: null,
			dt: FRAME,
			tuning: TUNING,
		});
		expect(filtered).toEqual({
			gravity: state.gravity,
			neutral: state.neutral,
			shake: { x: 0, y: 0 },
			lean: { x: 0, y: 0 },
		});
	});
});

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
		const state = seededWith(UPRIGHT, GLOBE_TUNING);
		const shakeOf = (x: number) =>
			filterReading({
				state,
				sample: { x, y: G },
				dt: FRAME,
				tuning: GLOBE_TUNING,
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

describe("filterReading recentring", () => {
	it("lets a held tilt become the new neutral over several recentre periods", () => {
		const seconds = 5 * TUNING.tiltRecenter;
		const early = leanAfter(seededWith(UPRIGHT), RIGHT_DOWN, 1);
		const late = leanAfter(seededWith(UPRIGHT), RIGHT_DOWN, seconds);
		expect(early.x).toBeGreaterThan(0.05);
		// The neutral trails gravity by ~e^-5 of the tilt: a lean near 0.001.
		expect(Math.abs(late.x)).toBeLessThan(0.002);
	});
});
