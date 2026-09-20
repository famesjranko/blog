import { describe, expect, it } from "vitest";
import { oklabToRgb } from "./colour.js";
import {
	PLACEHOLDER_HEIGHT,
	PLACEHOLDER_WIDTH,
	renderFluid,
	scheme,
} from "./fluid.js";

const POOL = ["#157ab5", "#c04316", "#78673b", "#1e5e66", "#0c81a5"];

describe("scheme", () => {
	it("builds five stops running from deep to pale", () => {
		const stops = scheme("tablescan", POOL);
		expect(stops).toHaveLength(5);
		const first = stops[0];
		const pale = stops[3];
		if (first === undefined || pale === undefined) {
			throw new Error("missing stops");
		}
		expect(first[0]).toBeLessThan(0.35);
		expect(pale[0]).toBeGreaterThan(0.8);
	});

	it("draws its anchor from the pool", () => {
		const [, anchor] = scheme("tablescan", POOL);
		if (anchor === undefined) {
			throw new Error("missing anchor");
		}
		const hex = oklabToRgb(anchor)
			.map((v) => v.toString(16).padStart(2, "0"))
			.join("");
		expect(POOL.map((p) => p.slice(1))).toContain(hex);
	});

	it("refuses an empty pool", () => {
		expect(() => scheme("x", [])).toThrow(/empty/);
	});
});

describe("renderFluid", () => {
	it("fills a 640 by 360 RGB buffer", () => {
		const image = renderFluid("tablescan", POOL);
		expect(image.width).toBe(PLACEHOLDER_WIDTH);
		expect(image.height).toBe(PLACEHOLDER_HEIGHT);
		expect(image.data.length).toBe(640 * 360 * 3);
	});

	it("is reproducible from the slug alone", () => {
		const a = renderFluid("tablescan", POOL);
		const b = renderFluid("tablescan", POOL);
		expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(true);
	});

	it("gives different slugs different pictures", () => {
		const a = renderFluid("tablescan", POOL);
		const b = renderFluid("musicmeta", POOL);
		expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
	});

	it("uses the whole ramp rather than one flat tone", () => {
		const { data } = renderFluid("tablescan", POOL);
		let min = 255;
		let max = 0;
		for (let index = 0; index < data.length; index += 3) {
			const value = data[index] ?? 0;
			min = Math.min(min, value);
			max = Math.max(max, value);
		}
		expect(max - min).toBeGreaterThan(120);
	});
});
