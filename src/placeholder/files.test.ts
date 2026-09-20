import { describe, expect, it } from "vitest";
import { coverlessSlugs, placeholderFile, stalePlaceholders } from "./files.js";

describe("coverlessSlugs", () => {
	it("lists only pieces without a cover, sorted", () => {
		expect(
			coverlessSlugs([
				{ slug: "zeta" },
				{ slug: "alpha", cover: "/img/a/cover.jpg" },
				{ slug: "beta", cover: undefined },
			]),
		).toEqual(["beta", "zeta"]);
	});

	it("collapses an essay and a project that share a slug", () => {
		expect(coverlessSlugs([{ slug: "same" }, { slug: "same" }])).toEqual([
			"same",
		]);
	});
});

describe("stalePlaceholders", () => {
	it("reports files that no coverless piece needs", () => {
		const present = [placeholderFile("old"), placeholderFile("tablescan")];
		expect(stalePlaceholders(present, ["tablescan"])).toEqual([
			placeholderFile("old"),
		]);
	});

	it("is empty when disk and content agree", () => {
		expect(stalePlaceholders([placeholderFile("a")], ["a"])).toEqual([]);
	});
});
