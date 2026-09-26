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
	twistFloor: 3,
	twistFull: 6,
};
const UNSEEDED: FilterState = {
	seeded: false,
	gravity: { x: 0, y: 0 },
	neutral: { x: 0, y: 0 },
};

// The reaction of a phone turned counter-clockwise by THETA from upright,
// looking at the screen, with LENGTH of gravity in the screen plane.
function turned(theta: number, length = G): Vec2 {
	return { x: length * Math.sin(theta), y: length * Math.cos(theta) };
}

// Frame times from 0 to SECONDS inclusive at 60 Hz.
function times(seconds: number): number[] {
	const count = Math.round(seconds / FRAME) + 1;
	return Array.from({ length: count }, (_, i) => i * FRAME);
}

function seededWith(sample: Vec2, tuning = TUNING): FilterState {
	const first = filterReading({ state: UNSEEDED, sample, dt: FRAME, tuning });
	return { seeded: true, gravity: first.gravity, neutral: first.neutral };
}

// Feeds the samples one per frame from unseeded (the first one seeds)
// and returns every step's spin.
function spins(samples: Vec2[]): number[] {
	let state = UNSEEDED;
	const result: number[] = [];
	for (const sample of samples) {
		const filtered = filterReading({
			state,
			sample,
			dt: FRAME,
			tuning: TUNING,
		});
		result.push(filtered.spin);
		state = {
			seeded: true,
			gravity: filtered.gravity,
			neutral: filtered.neutral,
		};
	}
	return result;
}

function largest(values: number[]): number {
	return Math.max(...values.map(Math.abs));
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
		// Measured on a phone: tilting and handling read 3 to 5 m/s², a shake 20 or more.
		const state = seededWith(UPRIGHT, SLOSH_TUNING);
		const shakeOf = (x: number) =>
			filterReading({
				state,
				sample: { x, y: G },
				dt: FRAME,
				tuning: SLOSH_TUNING,
			}).shake;
		expect(shakeOf(3)).toEqual({ x: 0, y: 0 });
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

describe("filterReading twist", () => {
	it("spins positive at the turn rate for a counter-clockwise steering-wheel turn", () => {
		const result = spins(times(1).map((t) => turned(1 * t)));
		// The 0.15 s gravity lag is a constant angle once settled; after 1 s
		// its start-up transient is e^(-1/0.15) ≈ 0.1% of the rate.
		expect(result.at(-1)).toBeCloseTo(1, 2);
	});

	it("does not spin for a forward or back tilt of an upright phone", () => {
		// Tilted back 40° gravity keeps 7.5 m/s² in plane, above twistFull,
		// so the flat-phone fade cannot hide a spin here.
		const tilt = (t: number) => (t * 40 * Math.PI) / 180;
		const result = spins(
			times(1).map((t) => ({ x: 0, y: G * Math.cos(tilt(t)) })),
		);
		expect(largest(result)).toBeLessThan(1e-9);
	});

	it("stays at the turn rate as gravity crosses the ±π angle", () => {
		// Starts turned half a radian short of the reading pointing along
		// -x, where its atan2 angle wraps from π to -π, and crosses it.
		const start = -Math.PI / 2 - 0.5;
		const result = spins(times(1).map((t) => turned(start + t)));
		// A wrap bug reads 2π in a frame: about 377 rad/s.
		expect(largest(result)).toBeLessThan(1.1);
		expect(result.at(-1)).toBeCloseTo(1, 2);
	});
});

describe("filterReading flat-phone fade", () => {
	it("does not spin for a phone lying near flat, however its in-plane gravity turns", () => {
		// 1 m/s² in plane is about 6° from flat, below twistFloor.
		const result = spins(times(1).map((t) => turned(1 * t, 1)));
		expect(largest(result)).toBe(0);
	});

	it("fades the spin in between twistFloor and twistFull", () => {
		// 4.5 m/s² is midway between the floor and the full length.
		const result = spins(times(1).map((t) => turned(1 * t, 4.5)));
		expect(result.at(-1)).toBeGreaterThan(0.1);
		expect(result.at(-1)).toBeLessThan(0.9);
	});
});

describe("filterReading without a twist", () => {
	it.each([
		{ case: "without a reading", sample: null, dt: FRAME, stale: false },
		{
			case: "when no time has passed",
			sample: turned(0.3),
			dt: 0,
			stale: false,
		},
		// Paused on its side and resumed upright: the stale gravity is 90° away.
		{ case: "on the seeding step", sample: UPRIGHT, dt: FRAME, stale: true },
	])("reports no spin $case", ({ sample, dt, stale }) => {
		const onSide = seededWith(turned(Math.PI / 2));
		const state = stale ? { ...onSide, seeded: false } : onSide;
		const filtered = filterReading({ state, sample, dt, tuning: TUNING });
		// Math.abs folds -0 into 0; NaN or any turn still fails.
		expect(Math.abs(filtered.spin)).toBe(0);
	});
});
