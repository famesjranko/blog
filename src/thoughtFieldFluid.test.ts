import { describe, expect, it } from "vitest";
import { project } from "../static/js/thought-field-fluid.js";
import type { Channel, Fluid } from "../static/js/thought-field-grid.js";
import {
	makeFluid,
	sample,
	sampleBuffer,
	splat,
	splatWeight,
} from "../static/js/thought-field-grid.js";

const COLS = 8;
const ROWS = 6;
// Enough Jacobi sweeps to converge fully on an 8×6 grid.
const CONVERGED = 4000;

// Deterministic generator so every run sees the same "random" field.
function generator(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

function at(buf: Float64Array, k: number): number {
	return buf[k] ?? Number.NaN;
}

// Writes VALUE(gx, gy) into every entry of the channel's velocity, using
// the layout the Channel type documents: array column gx + sx, row gy + sy.
function fill(channel: Channel, value: (gx: number, gy: number) => number) {
	const { data, stride, sx, sy } = channel;
	for (let k = 0; k < data.length; k += 1) {
		const column = k % stride;
		const row = Math.floor(k / stride);
		data[k] = value(column - sx, row - sy);
	}
}

// Net outflow of cell (i, j), 1-based, read through the public sampler at
// the centres of its four faces.
function outflow(fluid: Fluid, i: number, j: number): number {
	const right = sample(fluid.u, i, j - 0.5);
	const left = sample(fluid.u, i - 1, j - 0.5);
	const top = sample(fluid.v, i - 0.5, j);
	const bottom = sample(fluid.v, i - 0.5, j - 1);
	return (right - left + top - bottom) / fluid.h;
}

function maxOutflow(fluid: Fluid): number {
	let worst = 0;
	for (let j = 1; j <= fluid.rows; j += 1) {
		for (let i = 1; i <= fluid.cols; i += 1) {
			worst = Math.max(worst, Math.abs(outflow(fluid, i, j)));
		}
	}
	return worst;
}

function maxSpeed(fluid: Fluid): number {
	let worst = 0;
	for (let j = 0; j <= fluid.rows * 4; j += 1) {
		for (let i = 0; i <= fluid.cols * 4; i += 1) {
			const u = sample(fluid.u, i / 4, j / 4);
			const v = sample(fluid.v, i / 4, j / 4);
			worst = Math.max(worst, Math.hypot(u, v));
		}
	}
	return worst;
}

describe("project", () => {
	it("leaves a random field divergence-free", () => {
		const fluid = makeFluid(COLS, ROWS);
		const random = generator(7);
		fill(fluid.u, () => random() * 2 - 1);
		fill(fluid.v, () => random() * 2 - 1);
		const before = maxOutflow(fluid);
		project(fluid, CONVERGED);
		expect(before).toBeGreaterThan(1);
		expect(maxOutflow(fluid)).toBeLessThan(1e-6);
	});

	it("leaves an already divergence-free flow unchanged", () => {
		const fluid = makeFluid(COLS, ROWS);
		// A stream function at the grid nodes, zero on the walls, gives face
		// velocities with exactly zero net outflow from every cell.
		const psi = (gx: number, gy: number) =>
			Math.sin((Math.PI * gx) / COLS) * Math.sin((Math.PI * gy) / ROWS);
		const h = fluid.h;
		fill(fluid.u, (gx, gy) => (psi(gx, gy + 0.5) - psi(gx, gy - 0.5)) / h);
		fill(fluid.v, (gx, gy) => -(psi(gx + 0.5, gy) - psi(gx - 0.5, gy)) / h);
		const probe = () => [
			sample(fluid.u, 3, 2.5),
			sample(fluid.v, 5.5, 4),
			sample(fluid.u, 1, 0.5 + 0.25),
		];
		const before = probe();
		project(fluid, CONVERGED);
		const after = probe();
		expect(Math.abs(before[0] ?? 0)).toBeGreaterThan(0.1);
		for (let n = 0; n < after.length; n += 1) {
			expect(after[n]).toBeCloseTo(before[n] ?? Number.NaN, 6);
		}
	});

	it("cancels a uniform push entirely in a closed box", () => {
		const fluid = makeFluid(COLS, ROWS);
		fill(fluid.u, () => 0.8);
		fill(fluid.v, () => -0.6);
		expect(maxSpeed(fluid)).toBeGreaterThan(0.9);
		project(fluid, CONVERGED);
		expect(maxSpeed(fluid)).toBeLessThan(1e-6);
	});
});

describe("sample", () => {
	it("is exact on a linear field for both components", () => {
		const fluid = makeFluid(COLS, ROWS);
		const linear = (gx: number, gy: number) => 0.3 + 1.7 * gx - 0.9 * gy;
		const random = generator(11);
		for (const channel of [fluid.u, fluid.v]) {
			fill(channel, linear);
			for (let n = 0; n < 50; n += 1) {
				const gx = random() * COLS;
				const gy = random() * ROWS;
				expect(sample(channel, gx, gy)).toBeCloseTo(linear(gx, gy), 10);
			}
		}
	});
});

// Splats AMOUNT at a random interior point of the channel and returns
// the point and the change to every entry of its velocity.
function splatOnce(channel: Channel, random: () => number, amount: number) {
	const gx = 1 + random() * (COLS - 2);
	const gy = 1 + random() * (ROWS - 2);
	const before = channel.data.slice();
	splat(channel, gx, gy, amount);
	const change = channel.data.map((value, k) => value - at(before, k));
	return { gx, gy, change };
}

describe("splat", () => {
	it("adds exactly the amount to the velocity, with the weights sample reads", () => {
		const fluid = makeFluid(COLS, ROWS);
		const random = generator(13);
		for (const channel of [fluid.u, fluid.v]) {
			fill(channel, () => random() * 2 - 1);
			// An independent probe field in src shows which weights were used.
			channel.src.forEach((_, k) => {
				channel.src[k] = random() * 2 - 1;
			});
			for (let n = 0; n < 20; n += 1) {
				const amount = random() * 4 - 2;
				const { gx, gy, change } = splatOnce(channel, random, amount);
				let total = 0;
				let weighted = 0;
				change.forEach((delta, k) => {
					total += delta;
					weighted += delta * at(channel.src, k);
				});
				const probe = sampleBuffer(channel, channel.src, gx, gy);
				expect(total).toBeCloseTo(amount, 12);
				expect(weighted).toBeCloseTo(amount * probe, 12);
			}
		}
	});

	it("splatWeight is the share of a splat the sample there reads back", () => {
		const fluid = makeFluid(COLS, ROWS);
		const random = generator(17);
		for (const channel of [fluid.u, fluid.v]) {
			for (let n = 0; n < 20; n += 1) {
				const amount = 1 + random();
				const { gx, gy, change } = splatOnce(channel, random, amount);
				let squares = 0;
				for (const delta of change) {
					squares += (delta / amount) ** 2;
				}
				expect(splatWeight(channel, gx, gy)).toBeCloseTo(squares, 12);
			}
		}
	});
});
