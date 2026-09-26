import { describe, expect, it } from "vitest";
import type { GlobeInput } from "../static/js/thought-field-globe.js";
import {
	GLOBE_TUNING,
	makeGlobe,
	sampleFlow,
	stepGlobe,
} from "../static/js/thought-field-globe.js";

const FRAME = 1 / 60;
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

function stencilField(points: Array<[number, number]>) {
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
		const field = stencilField(points);
		const globe = makeGlobe(field.count);
		const flow = { energy: 1, time: 2.3, twist: 0.7 };
		sampleFlow({ globe, field, flow, tuning: GLOBE_TUNING });
		const u = (point: number, side: number, axis: number) =>
			at(globe.flow, (point * 4 + side) * 2 + axis);
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

describe("stepGlobe", () => {
	it("scatters on a firm shake, then settles once it stops", () => {
		const count = 40;
		const field = {
			count,
			pos: Float32Array.from({ length: count * 3 }, (_, i) =>
				i % 3 === 2 ? 0 : ((i * 0.37) % 2) - 1,
			),
			scale: Float32Array.from(
				{ length: count },
				(_, i) => 0.9 + (i % 10) / 11,
			),
		};
		const start = Float32Array.from(field.pos);
		let globe = makeGlobe(count);
		for (let frame = 0; frame < 60 * 7; frame += 1) {
			const t = frame * FRAME;
			// 12 m/s² at 3 Hz for half a second, then still.
			const shake = t < 0.5 ? 12 * Math.sin(2 * Math.PI * 3 * t) : 0;
			const input: GlobeInput = {
				shake: { x: shake, y: 0 },
				lean: { x: 0, y: 0 },
				spin: 0,
			};
			const tuning = GLOBE_TUNING;
			globe = stepGlobe({
				globe,
				field,
				input,
				dt: FRAME,
				time: t,
				tuning,
			}).globe;
		}
		const moved = Array.from(field.pos, (v, i) => Math.abs(v - at(start, i)));
		expect(Math.max(...moved)).toBeGreaterThan(0.1);
		expect(Math.max(...moved)).toBeLessThan(1.5);
		expect(globe.energy).toBeLessThan(0.01);
		expect(Math.max(...Array.from(globe.vel, Math.abs))).toBeLessThan(0.01);
	});
});
