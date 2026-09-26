import { describe, expect, it } from "vitest";
import {
	PATTERN_TUNING,
	makeWaves,
	sampleFlow,
} from "../static/js/thought-field-pattern.js";

// A power of two, so x ± H is exact in the Float32 position buffer.
const H = 1 / 1024;
// Around each centre: +x, -x, +y, -y.
const NEIGHBOURS = [
	[H, 0],
	[-H, 0],
	[0, H],
	[0, -H],
] as const;

function centres(): Array<[number, number]> {
	const out: Array<[number, number]> = [];
	for (let i = 0; i < 7; i += 1) {
		for (let j = 0; j < 5; j += 1) {
			out.push([-1.5 + i * 0.5, -1 + j * 0.5]);
		}
	}
	return out;
}

function stencil(points: Array<[number, number]>) {
	const coords = points.flatMap(([x, y]) =>
		NEIGHBOURS.flatMap(([dx, dy]) => [x + dx, y + dy, 0]),
	);
	return { count: coords.length / 3, pos: Float32Array.from(coords) };
}

function at(values: Float32Array, index: number): number {
	return values[index] ?? Number.NaN;
}

describe("sampleFlow", () => {
	it("is divergence-free while it swirls", () => {
		const points = centres();
		const { pos, count } = stencil(points);
		const flow = new Float32Array(count * 2);
		const sweep = { energy: 1, time: 2.3 };
		const waves = makeWaves();
		sampleFlow({ waves, pos, flow, count, sweep, tuning: PATTERN_TUNING });
		const u = (point: number, side: number, axis: number) =>
			at(flow, (point * 4 + side) * 2 + axis);
		const divergence = points.map(
			(_, p) => (u(p, 0, 0) - u(p, 1, 0) + u(p, 2, 1) - u(p, 3, 1)) / (2 * H),
		);
		const vorticity = points.map(
			(_, p) => (u(p, 0, 1) - u(p, 1, 1) - u(p, 2, 0) + u(p, 3, 0)) / (2 * H),
		);
		expect(Math.max(...divergence.map(Math.abs))).toBeLessThan(0.02);
		expect(Math.max(...vorticity.map(Math.abs))).toBeGreaterThan(2);
	});
});
