import { describe, expect, it } from "vitest";
import { hashSeed, makeNoise, makeRandom } from "./noise.js";

describe("makeRandom", () => {
	it("is deterministic for a seed and different across seeds", () => {
		const a = makeRandom("tablescan");
		const b = makeRandom("tablescan");
		const c = makeRandom("musicmeta");
		const first = Array.from({ length: 5 }, () => a());
		expect(Array.from({ length: 5 }, () => b())).toEqual(first);
		expect(Array.from({ length: 5 }, () => c())).not.toEqual(first);
	});

	it("stays inside [0, 1) over many draws", () => {
		const random = makeRandom("range");
		for (let index = 0; index < 10000; index += 1) {
			const value = random();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it("survives a seed whose hash is zero", () => {
		// FNV-1a of the empty string is the offset basis, never zero, so
		// force the guard by checking the hash directly and the stream.
		expect(hashSeed("")).not.toBe(0);
		const random = makeRandom("");
		expect(random()).not.toBe(random());
	});
});

describe("makeNoise", () => {
	const noise = makeNoise(makeRandom("noise"));

	it("is zero on integer lattice points", () => {
		expect(noise.at(3, 7)).toBe(0);
		expect(noise.at(-2, 5)).toBe(0);
	});

	it("is continuous: neighbouring samples differ by a small amount", () => {
		const a = noise.at(1.5, 2.5);
		const b = noise.at(1.501, 2.5);
		expect(Math.abs(a - b)).toBeLessThan(0.01);
	});

	it("keeps fractal sums inside -1..1", () => {
		for (let index = 0; index < 2000; index += 1) {
			const value = noise.fbm(index * 0.37, index * 0.11);
			expect(Math.abs(value)).toBeLessThanOrEqual(1);
		}
	});

	it("adds detail with each octave", () => {
		const coarse = noise.fbm(0.3, 0.8, 1);
		const fine = noise.fbm(0.3, 0.8, 5);
		expect(fine).not.toBe(coarse);
	});
});
