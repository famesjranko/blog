import { describe, expect, it } from "vitest";
import { normalizeFrontmatter } from "./schema.js";

describe("normalizeFrontmatter", () => {
	it("prefers topics over Hugo tags", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			tags: ["ethics"],
			topics: ["privacy"],
			draft: false,
		});
		expect(meta.topics).toEqual(["privacy"]);
	});

	it("falls back to Hugo tags when topics are absent", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			tags: ["ethics", "privacy"],
			draft: false,
		});
		expect(meta.topics).toEqual(["ethics", "privacy"]);
	});

	it("rejects frontmatter without a title", () => {
		expect(() =>
			normalizeFrontmatter({
				title: "",
				date: "2020-05-14",
				draft: false,
			}),
		).toThrow();
	});
});
