import { describe, expect, it } from "vitest";
import type { Orbit } from "../static/js/thought-field-orbit.js";
import { createOrbit } from "../static/js/thought-field-orbit.js";

const DT = 1 / 60;
const TAIL_S = 0.25;
// Exact in a Float32Array, so a still particle reads exactly zero.
const NEAR = 0.25;

// The move one frame gives a particle at (X, Y), the press being at 0, 0.
function frameMove(orbit: Orbit, x: number, y: number) {
	const field = { count: 1, pos: Float32Array.from([x, y, 0]) };
	orbit.advance(DT);
	orbit.stir(field, DT);
	return { dx: (field.pos[0] ?? 0) - x, dy: (field.pos[1] ?? 0) - y };
}

function speed(orbit: Orbit): number {
	const { dx, dy } = frameMove(orbit, NEAR, 0);
	return Math.hypot(dx, dy);
}

function run(orbit: Orbit, seconds: number): void {
	for (let t = 0; t < seconds; t += DT) {
		orbit.advance(DT);
	}
}

function pressed(): Orbit {
	const orbit = createOrbit();
	orbit.press(0, 0, 1);
	return orbit;
}

describe("orbit while held", () => {
	it("turns nearby particles clockwise around the press point", () => {
		// Given a held press at the origin
		const orbit = pressed();

		// When one particle right of it and one above it each take a frame
		const right = frameMove(orbit, NEAR, 0);
		const above = frameMove(orbit, 0, NEAR);

		// Then the right one moves down and the upper one moves right
		expect(right.dy).toBeLessThan(0);
		// And neither moves toward or away from the press point
		expect(Math.abs(right.dx)).toBeLessThan(1e-6);
		expect(above.dx).toBeGreaterThan(0);
		expect(Math.abs(above.dy)).toBeLessThan(1e-6);
	});

	it("leaves a particle outside the orbit radius in place", () => {
		// Given a held press at the origin
		const orbit = pressed();

		// When a particle well away from it takes a frame
		const far = frameMove(orbit, 1.5, 0);

		// Then it does not move
		expect(far).toEqual({ dx: 0, dy: 0 });
	});
});

describe("other pointers while held", () => {
	it("keeps its centre when a second press lands", () => {
		// Given a hold at full strength at the origin
		const orbit = pressed();
		run(orbit, 1);

		// When another pointer presses far from the origin
		orbit.press(1, 1, 2);

		// Then particles near the origin still orbit it
		expect(speed(orbit)).toBeGreaterThan(0);
	});

	it("ignores a release from another pointer", () => {
		// Given a hold at full strength by pointer 1
		const orbit = pressed();
		run(orbit, 1);

		// When pointer 2 releases and the tail time passes
		orbit.release(2);
		run(orbit, TAIL_S);

		// Then the orbit is still running
		expect(speed(orbit)).toBeGreaterThan(0);
	});

	it("ignores movement from another pointer", () => {
		// Given a hold at full strength at the origin
		const orbit = pressed();
		run(orbit, 1);

		// When pointer 2 moves far from the origin
		orbit.move(1, 1, 2);

		// Then particles near the origin still orbit it
		expect(speed(orbit)).toBeGreaterThan(0);
	});
});

describe("orbit press during the fade", () => {
	it("continues from the current strength on a press during the fade", () => {
		// Given a hold at full strength, released and halfway through the fade
		const orbit = pressed();
		run(orbit, 1);
		orbit.release(1);
		run(orbit, TAIL_S / 2);
		const fading = speed(orbit);

		// When the field is pressed again
		orbit.press(0, 0, 1);
		const speeds = [speed(orbit), speed(orbit), speed(orbit)];

		// Then the orbit does not drop below where the fade had it
		expect(Math.min(...speeds)).toBeGreaterThanOrEqual(fading * 0.9);
		// And it keeps building
		expect(speeds[2]).toBeGreaterThan(speeds[0] ?? 0);
	});
});

describe("orbit release", () => {
	it("fades without a step after pointerup", () => {
		// Given a hold at full strength
		const orbit = pressed();
		run(orbit, 1);
		const held = speed(orbit);

		// When the pointer is released and the tail plays out
		orbit.release(1);
		const fade: number[] = [];
		for (let t = 0; t < TAIL_S; t += DT) {
			fade.push(speed(orbit));
		}

		// Then the first fading frame is close to the held speed
		expect(fade[0]).toBeGreaterThan(held * 0.9);
		// And every frame is slower than the last by a small amount
		const drops = fade.slice(1).map((v, i) => (fade[i] ?? 0) - v);
		expect(Math.min(...drops)).toBeGreaterThan(0);
		expect(Math.max(...drops)).toBeLessThan(held * 0.1);
	});

	it("stops the orbit when the tail ends", () => {
		// Given a released hold
		const orbit = pressed();
		run(orbit, 1);
		orbit.release(1);

		// When the tail has passed
		run(orbit, TAIL_S);

		// Then a nearby particle no longer moves
		expect(speed(orbit)).toBe(0);
	});
});

describe("long orbit hold", () => {
	it("keeps orbiting while the pointer remains held", () => {
		// Given a hold at full strength
		const orbit = pressed();
		run(orbit, 1);
		const held = speed(orbit);

		// When the pointer remains held well past the former safety timeout
		run(orbit, 9);

		// Then the orbit remains at full strength
		expect(speed(orbit)).toBeCloseTo(held, 9);
	});
});

describe("hover during an orbit", () => {
	it("pauses hover repulsion while held", () => {
		// Given a held press
		const orbit = pressed();

		// When a frame passes
		orbit.advance(DT);

		// Then hover repulsion has no share
		expect(orbit.hoverShare()).toBe(0);
	});

	it("brings hover repulsion back over a ramp after the fade", () => {
		// Given a hold that has been released
		const orbit = pressed();
		run(orbit, 1);
		orbit.release(1);

		// When frames pass until hover is whole again
		const shares: number[] = [];
		for (let i = 0; i < 120 && orbit.hoverShare() < 1; i += 1) {
			orbit.advance(DT);
			shares.push(orbit.hoverShare());
		}

		// Then hover stays paused through the fade
		const fadeFrames = Math.floor(TAIL_S / DT) - 1;
		expect(shares.slice(0, fadeFrames).every((s) => s === 0)).toBe(true);
		// And it returns in small steps, not in one frame
		const rises = shares.slice(1).map((v, i) => v - (shares[i] ?? 0));
		expect(Math.max(...rises)).toBeLessThan(0.1);
		// And it ends whole
		expect(shares.at(-1)).toBe(1);
	});
});
