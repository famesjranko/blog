import { describe, expect, it } from "vitest";
import type { Rgb } from "./colour.js";
import { makeRandom } from "./noise.js";
import { accents, kmeans, pixelsOf } from "./palette.js";

function block(colour: Rgb, count: number): Rgb[] {
	return Array.from({ length: count }, () => colour);
}

describe("kmeans", () => {
	it("recovers two well-separated colours, largest cluster first", () => {
		const pixels = [...block([200, 40, 20], 30), ...block([20, 60, 200], 70)];
		const centres = kmeans(pixels, 2, makeRandom("k"));
		expect(centres).toEqual([
			[20, 60, 200],
			[200, 40, 20],
		]);
	});

	it("is reproducible for the same seed", () => {
		const pixels = [
			...block([200, 40, 20], 5),
			...block([20, 60, 200], 5),
			...block([90, 90, 90], 5),
		];
		expect(kmeans(pixels, 3, makeRandom("a"))).toEqual(
			kmeans(pixels, 3, makeRandom("a")),
		);
	});

	it("returns nothing for no pixels", () => {
		expect(kmeans([], 4, makeRandom("z"))).toEqual([]);
	});
});

describe("accents", () => {
	it("keeps saturated mid-tones and drops greys, blacks and whites", () => {
		expect(
			accents([
				[21, 122, 181],
				[120, 120, 120],
				[5, 5, 5],
				[250, 250, 250],
				[192, 67, 22],
			]),
		).toEqual(["#157ab5", "#c04316"]);
	});
});

describe("pixelsOf", () => {
	it("unpacks RGB and skips the alpha channel of RGBA", () => {
		expect(pixelsOf(new Uint8Array([1, 2, 3, 4, 5, 6]), 3)).toEqual([
			[1, 2, 3],
			[4, 5, 6],
		]);
		expect(pixelsOf(new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255]), 4)).toEqual([
			[1, 2, 3],
			[4, 5, 6],
		]);
	});
});
