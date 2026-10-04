import { expect, it, vi } from "vitest";
import { effect } from "../static/js/thought-field-hold-forces.js";

const { applyClickForces } = await vi.importActual<{
	applyClickForces: (options: {
		pos: Float32Array;
		ix: number;
		events: ReadonlyArray<{
			mode: string;
			x: number;
			y: number;
			age: number;
			strength: number;
			phase?: string;
			heldFor?: number;
		}>;
		dt: number;
		aspect: number;
	}) => void;
}>("../static/js/thought-field-click-step.js");

type Mode = "hold-pull" | "hold-push" | "hold-orbit";

function force(
	mode: Mode,
	heldFor = 0.5,
	phase: "hold" | "release" = "hold",
	age = 0,
) {
	return effect({
		x: 0.3,
		y: 0,
		event: { mode, x: 0, y: 0, age, strength: 1, phase, heldFor },
		dt: 1 / 60,
		aspect: 2,
	});
}

it("moves nearby particles inward during a sustained pull and rebounds on release", () => {
	// Given a particle to the right of a pressed pull point.
	const newHold = force("hold-pull", 0);

	// When the press continues for half a second and is then released.
	const matureHold = force("hold-pull");
	const release = force("hold-pull", 0.5, "release");
	const lateRelease = force("hold-pull", 0.5, "release", 0.2);

	// Then the inward pull grows and a short outward rebound fades.
	expect(newHold.x).toBeLessThan(0);
	expect(matureHold.x).toBeLessThan(newHold.x);
	expect(release.x).toBeGreaterThan(0);
	expect(lateRelease.x).toBeGreaterThan(0);
	expect(lateRelease.x).toBeLessThan(release.x);
});

it("sends the same particle outward for push and clockwise for orbit", () => {
	// Given a particle to the right of the same held point.
	const pull = force("hold-pull");

	// When the push and orbit modes act for one frame.
	const push = force("hold-push");
	const orbit = force("hold-orbit");

	// Then their directions differ on both axes.
	expect(pull.x).toBeLessThan(0);
	expect(push.x).toBeGreaterThan(0);
	expect(push.y).toBe(0);
	expect(orbit.x).toBe(0);
	expect(orbit.y).toBeLessThan(0);
});

it("dispatches hold forces to particle positions without changing unrelated events", () => {
	// Given particles next to a held push and an unknown event.
	const pushed = new Float32Array([0.3, 0, 0]);
	const idle = new Float32Array([0.3, 0, 0]);
	const event = {
		mode: "hold-push" as const,
		x: 0,
		y: 0,
		age: 0,
		strength: 1,
		phase: "hold" as const,
		heldFor: 0.5,
	};

	// When the dispatcher applies one frame of each event.
	applyClickForces({
		pos: pushed,
		ix: 0,
		events: [event],
		dt: 1 / 60,
		aspect: 2,
	});
	applyClickForces({
		pos: idle,
		ix: 0,
		events: [{ ...event, mode: "off" }],
		dt: 1 / 60,
		aspect: 2,
	});

	// Then only the hold event moves its particle.
	expect(pushed[0] ?? 0).toBeGreaterThan(idle[0] ?? 0);
	expect(idle[0]).toBeCloseTo(0.3);
});

it("bounds the frame step and ignores distant, expired, and invalid samples", () => {
	// Given a particle close to a held push, a distant particle, and malformed inputs.
	const event = {
		mode: "hold-push" as const,
		x: 0,
		y: 0,
		age: 0,
		strength: 1,
		phase: "hold" as const,
		heldFor: 1,
	};
	const sample = (x: number, dt: number, age = 0) =>
		effect({ x, y: 0, event: { ...event, age }, dt, aspect: 2 });

	// When the force is sampled over a long frame and outside its valid range.
	const longFrame = sample(0.05, 10);
	const far = sample(2, 1 / 60);
	const expired = effect({
		x: 0.3,
		y: 0,
		event: { ...event, phase: "release", age: 0.25 },
		dt: 1 / 60,
		aspect: 2,
	});
	const paused = sample(0.3, 0);
	const reversed = sample(0.3, -1);
	const invalid = sample(Number.NaN, 1 / 60);
	const invalidEvent = effect({
		x: 0.3,
		y: 0,
		event: { ...event, heldFor: Number.POSITIVE_INFINITY },
		dt: 1 / 60,
		aspect: 2,
	});

	// Then displacement remains small or exactly zero without nonfinite output.
	expect(Math.hypot(longFrame.x, longFrame.y)).toBeLessThanOrEqual(0.03);
	expect(far).toStrictEqual({ x: 0, y: 0 });
	expect(expired).toStrictEqual({ x: 0, y: 0 });
	expect(paused).toStrictEqual({ x: 0, y: 0 });
	expect(reversed).toStrictEqual({ x: 0, y: 0 });
	expect(invalid).toStrictEqual({ x: 0, y: 0 });
	expect(invalidEvent).toStrictEqual({ x: 0, y: 0 });
});
