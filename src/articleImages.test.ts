import { describe, expect, it } from "vitest";
import {
	articleCandidateWidths,
	articleImagePlan,
	articleImagePlans,
} from "./articleImages.js";

describe("articleCandidateWidths", () => {
	it("uses the ladder below the source and ends at the source width", () => {
		expect(articleCandidateWidths({ width: 1498, height: 633 })).toEqual([
			480, 720, 960, 1280, 1498,
		]);
	});

	it("deduplicates a source width already in the ladder", () => {
		expect(articleCandidateWidths({ width: 1280, height: 540 })).toEqual([
			480, 720, 960, 1280,
		]);
	});

	it("never upscales a source narrower than the ladder", () => {
		expect(articleCandidateWidths({ width: 400, height: 300 })).toEqual([400]);
	});
});

describe("articleImagePlan", () => {
	it("keeps the source aspect ratio instead of cropping to 16:9", () => {
		const plan = articleImagePlan("/img/essays/whatis-philosophy/cover.jpg");
		expect(
			plan?.candidates.map(({ width, height }) => [width, height]),
		).toEqual([
			[480, 203],
			[720, 304],
			[960, 405],
			[1280, 540],
		]);
	});

	it("names body renditions apart from card renditions", () => {
		const plan = articleImagePlan("/img/essays/whatis-philosophy/cover.jpg");
		expect(plan?.candidates[1]).toMatchObject({
			avifSrc: "/img/essays/whatis-philosophy/cover.body-720w.avif",
			webpSrc: "/img/essays/whatis-philosophy/cover.body-720w.webp",
		});
	});

	it("leaves non-JPEG, external, relative, and unknown sources unplanned", () => {
		for (const src of [
			"/img/essays/dretske-closure/euler-diagram.svg",
			"/img/essays/whatis-philosophy/cover.webp",
			"https://example.com/x.jpg",
			"//example.com/x.jpg",
			"img/x.jpg",
			"/img/unknown.jpg",
		]) {
			expect(articleImagePlan(src), src).toBeUndefined();
		}
	});
});

describe("articleImagePlans", () => {
	it("plans a source used twice once and skips unplannable sources", () => {
		const cover = "/img/essays/whatis-philosophy/cover.jpg";
		const plans = articleImagePlans([cover, "/img/x.png", cover]);
		expect(plans.map((plan) => plan.source)).toEqual([cover]);
	});
});
