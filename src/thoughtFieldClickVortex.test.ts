import { expect, it } from "vitest";
import {
	effect,
	evolveVortices,
	type VortexEvent,
} from "../static/js/thought-field-click-vortex.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;

function event(overrides: Partial<VortexEvent> = {}): VortexEvent {
	return {
		x: 0,
		y: 0,
		age: 0.3,
		strength: 1,
		mode: "vortex-alternate",
		phase: 0,
		...overrides,
	};
}

function flow(source: VortexEvent, x = 0.2, y = 0) {
	return effect({ x, y, event: source, dt: FRAME, aspect: ASPECT });
}

it("chooses alternating spin by phase and position spin by field half", () => {
	// Given four clicks at the same particle position.
	const first = event({ phase: 0 });
	const second = event({ phase: 1 });
	const left = event({ mode: "vortex-position", x: -0.1 });
	const right = event({ mode: "vortex-position", x: 0.1 });

	// When their forces act on a particle to the right of each centre.
	const alternate = [flow(first).y, flow(second).y];
	const positioned = [flow(left, 0.1).y, flow(right, 0.3).y];

	// Then both choices give deterministic opposite rotations.
	expect(alternate[0]).toBeGreaterThan(0);
	expect(alternate[1]).toBeLessThan(0);
	expect(positioned[0]).toBeGreaterThan(0);
	expect(positioned[1]).toBeLessThan(0);
});

it("moves two simultaneous wells through their shared flow", () => {
	// Given two equal wells above and below the origin.
	const upper = event({ x: 0, y: 0.2, age: 0, spin: 1 });
	const lower = event({ x: 0, y: -0.2, age: 0, spin: 1 });

	// When both wells evolve for one frame.
	const moved = evolveVortices([upper, lower], FRAME, ASPECT);

	// Then they orbit in opposite horizontal directions.
	expect(moved).toHaveLength(2);
	expect(moved[0]?.x).toBeLessThan(0);
	expect(moved[1]?.x).toBeGreaterThan(0);
	expect(moved[0]?.spin).toBeLessThan(1);
});

it("grows, fades and expires so ordinary drift can resume", () => {
	// Given one vortex sampled at birth, peak, late fade and expiry.
	const ages = [0, 0.3, 2.9, 3];

	// When its force acts at the same nearby point.
	const speeds = ages.map((age) => {
		const displacement = flow(event({ age }));
		return Math.hypot(displacement.x, displacement.y);
	});

	// Then it grows, decays and reaches exactly zero at expiry.
	expect(speeds[0]).toBe(0);
	expect(speeds[1]).toBeGreaterThan(speeds[2] ?? Number.NaN);
	expect(speeds[2]).toBeGreaterThan(0);
	expect(speeds[3]).toBe(0);
});

it("keeps only the three newest active wells", () => {
	// Given four clicks and one click past its lifetime.
	const events = [
		event({ x: -0.4, phase: 0 }),
		event({ x: -0.2, phase: 1 }),
		event({ x: 0, phase: 2 }),
		event({ x: 0.2, phase: 3 }),
		event({ x: 0.4, age: 3 }),
	];

	// When the state advances one frame.
	const moved = evolveVortices(events, FRAME, ASPECT);

	// Then the oldest and expired wells are absent.
	expect(moved).toHaveLength(3);
	expect(moved.map((well) => well.phase)).toEqual([1, 2, 3]);
});
