import { describe, expect, it } from "vitest";
import { filterReading } from "../static/js/thought-field-motion-filter.js";
import type {
	SloshState,
	SloshTuning,
	Vec2,
} from "../static/js/thought-field-slosh.js";
import {
	SLOSH_TUNING,
	reseedSlosh,
	restingSlosh,
	sloshWeight,
	stepSlosh,
} from "../static/js/thought-field-slosh.js";

const G = 9.81;
const FRAME = 1 / 60;
// Portrait, held upright: the reading points up the screen at 1 g.
const UPRIGHT: Vec2 = { x: 0, y: G };
// A jerk to the right: the reading gains +5 m/s² along x.
const JOLT_RIGHT: Vec2 = { x: 5, y: G };
// Filters frozen at the seed, no lean, no deadzone: the shake is exactly
// the reading minus the seed, so only the spring is on trial.
const PURE_SPRING: Partial<SloshTuning> = {
	tiltLean: 0,
	deadzone: 0,
	gravitySmoothing: Number.POSITIVE_INFINITY,
	tiltRecenter: Number.POSITIVE_INFINITY,
};

// The jolts and hand arithmetic below were sized for this deadzone, so
// the suite pins it rather than follow the shipped tuning.
const DEADZONE = 0.6;

function tuned(overrides: Partial<SloshTuning> = {}): SloshTuning {
	return { ...SLOSH_TUNING, deadzone: DEADZONE, ...overrides };
}

function magnitude(v: Vec2): number {
	return Math.hypot(v.x, v.y);
}

interface HoldOptions {
	state: SloshState;
	sample: Vec2 | null;
	seconds: number;
	tuning: SloshTuning;
	dt?: number;
}

interface Run {
	state: SloshState;
	shifts: Vec2[];
}

// Feeds the same reading every frame for the given time.
function hold({
	state,
	sample,
	seconds,
	tuning,
	dt = FRAME,
}: HoldOptions): Run {
	const shifts: Vec2[] = [];
	let current = state;
	for (let i = 0; i < Math.round(seconds / dt); i += 1) {
		const step = stepSlosh({ state: current, sample, dt, tuning });
		current = step.state;
		shifts.push(step.shift);
	}
	return { state: current, shifts };
}

function seededUpright(tuning: SloshTuning): SloshState {
	return stepSlosh({
		state: restingSlosh(),
		sample: UPRIGHT,
		dt: FRAME,
		tuning,
	}).state;
}

// Upright, then a 0.1 s jolt to the right.
function joltedRight(tuning: SloshTuning): Run {
	return hold({
		state: seededUpright(tuning),
		sample: JOLT_RIGHT,
		seconds: 0.1,
		tuning,
	});
}

function largest(shifts: Vec2[]): number {
	return Math.max(...shifts.map(magnitude));
}

describe("stepSlosh seeding", () => {
	it("takes the first reading from a tilted phone as neutral: no kick, no lean", () => {
		const run = hold({
			state: restingSlosh(),
			sample: { x: 3, y: 9 },
			seconds: 1,
			tuning: tuned(),
		});
		expect(largest(run.shifts)).toBeLessThan(1e-12);
	});
});

describe("stepSlosh tilt", () => {
	// Right edge lowered 30°: the reading's x is -g sin 30°.
	const RIGHT_DOWN: Vec2 = { x: -G * 0.5, y: G * Math.cos(Math.PI / 6) };
	// No kick, so any motion is the lean alone.
	const tuning = tuned({ shakeGain: 0 });

	it("leans the field toward the lowered edge", () => {
		const run = hold({
			state: seededUpright(tuning),
			sample: RIGHT_DOWN,
			seconds: 1,
			tuning,
		});
		// Lean ≈ 0.5 g / g × 0.25 × (neutral still ~80% behind) ≈ 0.1.
		expect(run.state.shown.x).toBeCloseTo(0.1, 1);
	});

	it("recentres once the tilt has been held for several recentre periods", () => {
		const run = hold({
			state: seededUpright(tuning),
			sample: RIGHT_DOWN,
			seconds: 5 * SLOSH_TUNING.tiltRecenter,
			tuning,
		});
		// The neutral trails gravity by ~e^-5 of the step: a lean near 0.001.
		expect(Math.abs(run.state.shown.x)).toBeLessThan(0.002);
	});
});

describe("stepSlosh shake", () => {
	it("kicks the field against a jolt first, then settles within seconds", () => {
		const tuning = tuned();
		const jolt = joltedRight(tuning);
		const after = hold({
			state: jolt.state,
			sample: UPRIGHT,
			seconds: 4,
			tuning,
		});
		const shifts = [...jolt.shifts, ...after.shifts];
		const firstMove = shifts.find((shift) => Math.abs(shift.x) > 0.01);
		expect(firstMove?.x).toBeLessThan(0);
		expect(magnitude(after.state.shown)).toBeLessThan(0.01);
	});

	it("swings past centre after a kick when underdamped", () => {
		const tuning = tuned({ ...PURE_SPRING, damping: 0.35 });
		const jolt = joltedRight(tuning);
		const after = hold({
			state: jolt.state,
			sample: UPRIGHT,
			seconds: 3,
			tuning,
		});
		expect(Math.max(...after.shifts.map((shift) => shift.x))).toBeGreaterThan(
			0.01,
		);
	});

	it.each([1, 2])("never swings past centre at damping %d", (damping) => {
		const tuning = tuned({ ...PURE_SPRING, damping });
		const jolt = joltedRight(tuning);
		const after = hold({
			state: jolt.state,
			sample: UPRIGHT,
			seconds: 5,
			tuning,
		});
		const xs = [...jolt.shifts, ...after.shifts].map((shift) => shift.x);
		expect(Math.min(...xs)).toBeLessThan(-0.01);
		expect(Math.max(...xs)).toBeLessThanOrEqual(0);
	});
});

describe("stepSlosh deadzone", () => {
	// No lean, so the shake is the only thing that can move the field.
	const tuning = tuned({ tiltLean: 0 });
	// One step of exactly one substep keeps the arithmetic by hand.
	const SUBSTEP = 1 / 120;

	it("ignores shake inside the deadzone", () => {
		const run = hold({
			state: seededUpright(tuning),
			sample: { x: 0.5, y: G },
			seconds: 1,
			tuning,
		});
		expect(largest(run.shifts)).toBe(0);
	});

	it("responds just past the deadzone to the excess only, without a jump", () => {
		const step = stepSlosh({
			state: seededUpright(tuning),
			sample: { x: 0.7, y: G },
			dt: SUBSTEP,
			tuning,
		});
		// Semi-implicit Euler from rest: v = a·h, x = v·h, a = -(0.7 - 0.6)·2.5.
		const expected = -0.1 * 2.5 * SUBSTEP * SUBSTEP;
		expect(step.shift.x).toBeCloseTo(expected, 12);
		expect(step.shift.y).toBe(0);
	});
});

describe("stepSlosh limits and stability", () => {
	it("keeps the shown shift within maxOffset for an absurd input", () => {
		const tuning = tuned();
		const run = hold({
			state: seededUpright(tuning),
			sample: { x: 1000, y: 1000 },
			seconds: 1,
			tuning,
		});
		// Pinned against the ceiling, not merely small.
		expect(largest(run.shifts)).toBeGreaterThan(0.9 * tuning.maxOffset);
		expect(largest(run.shifts)).toBeLessThanOrEqual(tuning.maxOffset + 1e-12);
	});

	it("stays stable at the loop's longest frame with a stiff spring", () => {
		const tuning = tuned({ frequency: 6 });
		const dt = 0.05;
		const kick = hold({
			state: seededUpright(tuning),
			sample: { x: 20, y: G },
			seconds: dt,
			tuning,
			dt,
		});
		const after = hold({
			state: kick.state,
			sample: UPRIGHT,
			seconds: 20,
			tuning,
			dt,
		});
		expect(after.shifts.every((s) => Number.isFinite(magnitude(s)))).toBe(true);
		expect(Number.isFinite(magnitude(after.state.offset))).toBe(true);
		expect(magnitude(after.state.shown)).toBeLessThan(1e-3);
	});

	it("returns the state unchanged with zero delta when no time has passed", () => {
		const tuning = tuned();
		const { state } = joltedRight(tuning);
		for (const dt of [0, -1]) {
			const step = stepSlosh({ state, sample: JOLT_RIGHT, dt, tuning });
			expect(step.state).toEqual(state);
			expect(step.shift).toEqual(state.shown);
			expect(step.delta).toEqual({ x: 0, y: 0 });
		}
	});
});

describe("stepSlosh without readings", () => {
	it("keeps a resting field exactly still", () => {
		const run = hold({
			state: restingSlosh(),
			sample: null,
			seconds: 1,
			tuning: tuned(),
		});
		for (const shift of run.shifts) {
			expect(shift).toEqual({ x: 0, y: 0 });
		}
	});

	it("lets a kicked field relax back to centre", () => {
		const tuning = tuned();
		const jolt = joltedRight(tuning);
		expect(magnitude(jolt.state.shown)).toBeGreaterThan(0.01);
		const after = hold({ state: jolt.state, sample: null, seconds: 5, tuning });
		expect(magnitude(after.state.shown)).toBeLessThan(1e-3);
	});
});

describe("stepSlosh outputs", () => {
	it("reports delta as the change in shift since the previous step", () => {
		const tuning = tuned();
		const samples: (Vec2 | null)[] = [
			UPRIGHT,
			JOLT_RIGHT,
			JOLT_RIGHT,
			{ x: -3, y: 7 },
			null,
			UPRIGHT,
		];
		let state = restingSlosh();
		let previous: Vec2 = { x: 0, y: 0 };
		for (const sample of samples) {
			const step = stepSlosh({ state, sample, dt: FRAME, tuning });
			expect(step.delta.x).toBeCloseTo(step.shift.x - previous.x, 15);
			expect(step.delta.y).toBeCloseTo(step.shift.y - previous.y, 15);
			state = step.state;
			previous = step.shift;
		}
		expect(magnitude(previous)).toBeGreaterThan(0.01);
	});

	it("does not mutate its inputs", () => {
		const tuning = Object.freeze(tuned());
		const { state } = joltedRight(tuning);
		const before = structuredClone(state);
		const frozen = Object.freeze({
			...state,
			gravity: Object.freeze({ ...state.gravity }),
			neutral: Object.freeze({ ...state.neutral }),
			offset: Object.freeze({ ...state.offset }),
			velocity: Object.freeze({ ...state.velocity }),
			shown: Object.freeze({ ...state.shown }),
		});
		const sample = Object.freeze({ x: -4, y: 6 });
		stepSlosh({ state: frozen, sample, dt: FRAME, tuning });
		expect(frozen).toEqual(before);
		expect(sample).toEqual({ x: -4, y: 6 });
	});
});

describe("reseedSlosh", () => {
	it("keeps the motion and clears seeded", () => {
		const { state } = joltedRight(tuned());
		const reseeded = reseedSlosh(state);
		expect(reseeded.seeded).toBe(false);
		expect(reseeded.offset).toEqual(state.offset);
		expect(reseeded.velocity).toEqual(state.velocity);
		expect(reseeded.shown).toEqual(state.shown);
	});

	it("lets a phone resumed at a new angle carry on without a kick", () => {
		const tuning = tuned();
		const paused = seededUpright(tuning);
		const run = hold({
			state: reseedSlosh(paused),
			sample: { x: 5, y: 8 },
			seconds: 1,
			tuning,
		});
		expect(largest(run.shifts)).toBeLessThan(1e-12);
	});
});

describe("stepSlosh filtered inputs", () => {
	it("reports the filter's shake and lean for the step", () => {
		const tuning = tuned();
		const state = seededUpright(tuning);
		// Jolted and tilted at once, so both outputs are non-zero.
		const sample = { x: 4, y: G - 2 };
		const step = stepSlosh({ state, sample, dt: FRAME, tuning });
		const filtered = filterReading({ state, sample, dt: FRAME, tuning });
		expect(magnitude(filtered.shake)).toBeGreaterThan(0);
		expect(magnitude(filtered.lean)).toBeGreaterThan(0);
		const { shake, lean } = step;
		expect({ shake, lean }).toEqual({
			shake: filtered.shake,
			lean: filtered.lean,
		});
	});

	it.each([
		{ case: "without a reading", sample: null, dt: FRAME },
		{ case: "when no time has passed", sample: JOLT_RIGHT, dt: 0 },
	])("reports no shake or lean $case", ({ sample, dt }) => {
		const tuning = tuned();
		const { state } = joltedRight(tuning);
		const step = stepSlosh({ state, sample, dt, tuning });
		expect(magnitude(step.shake)).toBe(0);
		expect(magnitude(step.lean)).toBe(0);
	});
});

describe("sloshWeight", () => {
	it("moves every particle equally at spread 0", () => {
		expect(sloshWeight(0.9, 0)).toBe(1);
		expect(sloshWeight(1.35, 0)).toBe(1);
		expect(sloshWeight(1.8, 0)).toBe(1);
	});

	it("spans 1 ± spread across the particle scale range", () => {
		expect(sloshWeight(0.9, 0.6)).toBeCloseTo(0.4, 12);
		expect(sloshWeight(1.35, 0.6)).toBeCloseTo(1, 12);
		expect(sloshWeight(1.8, 0.6)).toBeCloseTo(1.6, 12);
	});
});
