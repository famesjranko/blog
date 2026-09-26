import { describe, expect, it } from "vitest";
import type { Flakes } from "../static/js/thought-field-flakes.js";
import { moveFlakes } from "../static/js/thought-field-flakes.js";
import type { Fluid } from "../static/js/thought-field-grid.js";
import { makeFluid, sample } from "../static/js/thought-field-grid.js";

// makePoints scales run 0.9..1.8; the midpoint weighs exactly 1.
const MID_SCALE = 1.35;
// An interior point off every face centre, so all four weights are live.
const X = 0.13;
const Y = 0.07;
const DRAG = 0.3;
// A slow frame: the loop never hands over a longer step.
const SLOW_DT = 0.05;

// COUNT mid-weight flakes stacked at (X, Y), moving right at SPEED.
function stack(count: number, speed: number): Flakes {
	const pos = new Float32Array(count * 3);
	const vel = new Float32Array(count * 3);
	for (let i = 0; i < count; i += 1) {
		pos[i * 3] = X;
		pos[i * 3 + 1] = Y;
		vel[i * 3] = speed;
	}
	const scale = new Float32Array(count).fill(MID_SCALE);
	return { pos, vel, scale, count };
}

function step(flakes: Flakes, options: { mass: number; jolt?: number }) {
	const fluid = makeFluid(8, 6);
	moveFlakes(flakes, {
		fluid,
		dt: SLOW_DT,
		jolt: { x: options.jolt ?? 0, y: 0 },
		sink: { x: 0, y: 0 },
		drag: DRAG,
		spread: 0.4,
		mass: options.mass,
	});
	return fluid;
}

// The liquid's x speed at (X, Y), read the way a flake there reads it.
function liquidAt(fluid: Fluid): number {
	return sample(fluid.u, (X - fluid.left) / fluid.h, (Y + 1) / fluid.h);
}

function speeds(flakes: Flakes): number[] {
	return Array.from({ length: flakes.count }, (_, i) => flakes.vel[i * 3] ?? 0);
}

describe("moveFlakes", () => {
	it("follows the one-body drag solution when the flake is weightless", () => {
		const flakes = stack(1, 0);
		step(flakes, { mass: 0, jolt: 2 });
		// dv/dt = a - v / tau from rest, solved exactly over the step.
		const expected = 2 * DRAG * (1 - Math.exp(-SLOW_DT / DRAG));
		expect(speeds(flakes)[0]).toBeCloseTo(expected, 6);
	});

	it("keeps the momentum a flake loses to the liquid", () => {
		const flakes = stack(1, 1);
		const mass = 20;
		const fluid = step(flakes, { mass });
		const gained = fluid.u.data.reduce((total, value) => total + value, 0);
		const lost = 1 - (speeds(flakes)[0] ?? Number.NaN);
		expect(lost).toBeGreaterThan(0.01);
		expect(gained).toBeCloseTo(mass * lost, 5);
	});

	it("never pushes the liquid past a heavy flake on a slow frame", () => {
		const flakes = stack(1, 1);
		const fluid = step(flakes, { mass: 20 });
		const flake = speeds(flakes)[0] ?? Number.NaN;
		expect(liquidAt(fluid)).toBeGreaterThan(0);
		expect(liquidAt(fluid)).toBeLessThanOrEqual(flake + 1e-6);
		expect(flake).toBeLessThan(1);
	});

	it("never pushes the liquid past a crowd of heavy flakes on a slow frame", () => {
		const flakes = stack(6, 1);
		const fluid = step(flakes, { mass: 20 });
		// Each flake must feel what the ones before it did to the liquid.
		expect(liquidAt(fluid)).toBeGreaterThan(0.5);
		expect(liquidAt(fluid)).toBeLessThanOrEqual(1 + 1e-6);
		for (const speed of speeds(flakes)) {
			expect(speed).toBeGreaterThanOrEqual(0);
			expect(speed).toBeLessThanOrEqual(1);
		}
	});
});
