import { describe, expect, it } from "vitest";
import {
	cardCandidateWidths,
	cardImagePlan,
	cardImagePlans,
	cardImageSource,
} from "./cardImages.js";

describe("cardCandidateWidths", () => {
	it("uses ladder widths and the largest exact 16:9 source crop", () => {
		expect(cardCandidateWidths({ width: 1313, height: 533 })).toEqual([
			480, 720, 944,
		]);
	});

	it("deduplicates a natural maximum already in the ladder", () => {
		expect(cardCandidateWidths({ width: 720, height: 405 })).toEqual([
			480, 720,
		]);
	});

	it("never upscales either source dimension", () => {
		const size = { width: 300, height: 200 };
		const widths = cardCandidateWidths(size);
		expect(widths).toEqual([288]);
		for (const width of widths) {
			expect(width).toBeLessThanOrEqual(size.width);
			expect((width / 16) * 9).toBeLessThanOrEqual(size.height);
		}
	});

	it("returns no candidate when a source cannot provide an integer crop", () => {
		expect(cardCandidateWidths({ width: 15, height: 20 })).toEqual([]);
	});
});

describe("cardImagePlan", () => {
	it("plans named AVIF and WebP renditions for known internal JPEGs", () => {
		const plan = cardImagePlan("/img/essays/dreyfus-review/cover.jpg");
		expect(plan?.candidates.map((candidate) => candidate.width)).toEqual([
			480, 720, 944,
		]);
		expect(plan?.candidates.at(-1)).toEqual({
			width: 944,
			height: 531,
			avifSrc: "/img/essays/dreyfus-review/cover.card-944w.avif",
			webpSrc: "/img/essays/dreyfus-review/cover.card-944w.webp",
		});
	});

	it("leaves non-JPEG, external, relative, and unknown sources unplanned", () => {
		for (const src of [
			"/img/x.png",
			"https://example.com/x.jpg",
			"img/x.jpg",
			"/img/unknown.jpg",
		]) {
			expect(cardImagePlan(src), src).toBeUndefined();
		}
	});
});

describe("cardImagePlans", () => {
	it("resolves placeholders and deduplicates repeated card sources", () => {
		const pieces = [
			{ slug: "tablescan" },
			{ slug: "tablescan" },
			{ slug: "other", cover: "/img/placeholders/tablescan.jpg" },
		];
		expect(cardImageSource(pieces[0] ?? { slug: "missing" })).toBe(
			"/img/placeholders/tablescan.jpg",
		);
		expect(cardImagePlans(pieces)).toHaveLength(1);
	});
});
