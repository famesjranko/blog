import { describe, expect, it } from "vitest";
import {
	hexToRgb,
	hslToRgb,
	oklabToRgb,
	ramp,
	rgbToHex,
	rgbToHsl,
	rgbToOklab,
} from "./colour.js";

describe("hex parsing", () => {
	it("round-trips #rrggbb through rgb", () => {
		for (const hex of ["#000000", "#ffffff", "#157ab5", "#c04316"]) {
			expect(rgbToHex(hexToRgb(hex))).toBe(hex);
		}
	});

	it("rejects anything that is not six hex digits", () => {
		expect(() => hexToRgb("#fff")).toThrow(/rrggbb/);
		expect(() => hexToRgb("rgb(1, 2, 3)")).toThrow(/rrggbb/);
	});
});

describe("OKLab", () => {
	it("maps white to full lightness with no chroma", () => {
		const [L, a, b] = rgbToOklab([255, 255, 255]);
		expect(L).toBeCloseTo(1, 3);
		expect(a).toBeCloseTo(0, 3);
		expect(b).toBeCloseTo(0, 3);
	});

	it("round-trips cover colours within a byte", () => {
		for (const hex of ["#157ab5", "#c04316", "#78673b", "#1e5e66"]) {
			const rgb = hexToRgb(hex);
			const back = oklabToRgb(rgbToOklab(rgb));
			for (let channel = 0; channel < 3; channel += 1) {
				expect(
					Math.abs((back[channel] ?? 0) - (rgb[channel] ?? 0)),
				).toBeLessThanOrEqual(1);
			}
		}
	});

	it("keeps a blue-to-teal midpoint as saturated as its ends", () => {
		const mid = oklabToRgb(
			ramp([rgbToOklab([21, 122, 181]), rgbToOklab([30, 94, 102])], 0.5),
		);
		const spread = Math.max(...mid) - Math.min(...mid);
		expect(spread).toBeGreaterThan(100);
	});

	it("puts the black-to-white midpoint at perceptual mid-grey, not byte 128", () => {
		const [r, g, b] = oklabToRgb(
			ramp([rgbToOklab([0, 0, 0]), rgbToOklab([255, 255, 255])], 0.5),
		);
		expect(r).toBe(g);
		expect(g).toBe(b);
		expect(r).toBeGreaterThan(90);
		expect(r).toBeLessThan(110);
	});
});

describe("ramp", () => {
	const stops = [rgbToOklab([0, 0, 0]), rgbToOklab([255, 255, 255])] as const;

	it("returns the first stop at 0 and the last just below 1", () => {
		expect(oklabToRgb(ramp(stops, 0))).toEqual([0, 0, 0]);
		expect(oklabToRgb(ramp(stops, 0.999999))).toEqual([255, 255, 255]);
	});

	it("clamps positions outside 0..1", () => {
		expect(oklabToRgb(ramp(stops, -3))).toEqual([0, 0, 0]);
		expect(oklabToRgb(ramp(stops, 7))).toEqual([255, 255, 255]);
	});

	it("interpolates lightness linearly between stops", () => {
		const [L] = ramp(stops, 0.5);
		expect(L).toBeCloseTo(0.5, 2);
	});
});

describe("HSL", () => {
	it("round-trips a saturated colour", () => {
		expect(hslToRgb(rgbToHsl([192, 67, 22]))).toEqual([192, 67, 22]);
	});

	it("reports zero saturation for greys", () => {
		expect(rgbToHsl([90, 90, 90]).s).toBe(0);
	});
});
