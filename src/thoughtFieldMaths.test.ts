import { describe, expect, it } from "vitest";
import {
	densityCount,
	orthographicProjection,
	parseCssColour,
	srgbToLinear,
} from "../static/thought-field-maths.js";

// Reference values from the sRGB transfer function worked by hand.
const LINEAR_128 = ((128 / 255 + 0.055) / 1.055) ** 2.4;
const LINEAR_64 = ((64 / 255 + 0.055) / 1.055) ** 2.4;
const LINEAR_8 = 8 / 255 / 12.92;

describe("srgbToLinear", () => {
	it("uses the linear toe at and below the 0.04045 knee", () => {
		expect(srgbToLinear(0)).toBe(0);
		expect(srgbToLinear(0.04045)).toBeCloseTo(0.04045 / 12.92, 12);
	});

	it("uses the power curve just above the knee", () => {
		expect(srgbToLinear(0.05)).toBeCloseTo(0.0039359, 6);
		expect(srgbToLinear(128 / 255)).toBeCloseTo(0.2158605, 6);
		expect(srgbToLinear(1)).toBeCloseTo(1, 12);
	});
});

describe("parseCssColour", () => {
	it("parses computed rgb() into linear channels", () => {
		expect(parseCssColour("rgb(128, 64, 8)")).toEqual({
			r: LINEAR_128,
			g: LINEAR_64,
			b: LINEAR_8,
		});
	});

	it("parses rgba() and drops the alpha", () => {
		expect(parseCssColour("rgba(8, 128, 64, 0.5)")).toEqual({
			r: LINEAR_8,
			g: LINEAR_128,
			b: LINEAR_64,
		});
	});

	it("parses the space-separated form", () => {
		expect(parseCssColour("rgb(64 8 128 / 0.5)")).toEqual({
			r: LINEAR_64,
			g: LINEAR_8,
			b: LINEAR_128,
		});
	});

	it("parses #rrggbb fallbacks", () => {
		expect(parseCssColour("#804008")).toEqual({
			r: LINEAR_128,
			g: LINEAR_64,
			b: LINEAR_8,
		});
	});

	it("returns null for anything else", () => {
		expect(parseCssColour("")).toBeNull();
		expect(parseCssColour("transparent")).toBeNull();
		expect(parseCssColour("#fff")).toBeNull();
		expect(parseCssColour("color(srgb 1 0 0)")).toBeNull();
	});
});

function project(
	matrix: Float32Array,
	point: [number, number, number],
): number[] {
	const [x, y, z] = point;
	const at = (index: number): number => matrix[index] ?? Number.NaN;
	return [
		at(0) * x + at(4) * y + at(8) * z + at(12),
		at(1) * x + at(5) * y + at(9) * z + at(13),
		at(2) * x + at(6) * y + at(10) * z + at(14),
		at(3) * x + at(7) * y + at(11) * z + at(15),
	];
}

describe("orthographicProjection", () => {
	it("maps the visible rectangle (-aspect..aspect, -1..1) to clip space", () => {
		const matrix = orthographicProjection(2);
		expect(project(matrix, [2, 1, 0])).toEqual([1, 1, expect.any(Number), 1]);
		expect(project(matrix, [-2, -1, 0])).toEqual([
			-1,
			-1,
			expect.any(Number),
			1,
		]);
		expect(project(matrix, [1, 0.5, 0])[0]).toBeCloseTo(0.5, 6);
	});

	it("places z = 0 where a camera at z = 2 with near 0.1, far 10 sees it", () => {
		// Ortho depth: -2/(f-n) * (z - 2) - (f+n)/(f-n) at z = 0.
		const expected = (-2 / 9.9) * -2 - 10.1 / 9.9;
		expect(project(orthographicProjection(1), [0, 0, 0])[2]).toBeCloseTo(
			expected,
			6,
		);
		expect(Math.abs(expected)).toBeLessThan(1);
	});
});

describe("densityCount", () => {
	it("gives the reference desktop hero the full field", () => {
		expect(densityCount(1440, 800)).toBe(1600);
	});

	it("keeps particles per pixel constant on a phone hero", () => {
		// 412 x 720 is 0.2575 of the reference area: 1600 * 0.2575 = 412.
		expect(densityCount(412, 720)).toBe(412);
	});

	it("never drops below the floor on a tiny hero", () => {
		expect(densityCount(200, 300)).toBe(320);
	});

	it("never exceeds the full field on a huge hero", () => {
		expect(densityCount(3840, 2160)).toBe(1600);
	});
});
