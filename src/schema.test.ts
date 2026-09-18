import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import { normalizeFrontmatter, RawFrontmatterSchema } from "./schema.js";

const legacyFixture = new URL("./fixtures/hugo-jtb.md", import.meta.url);

function loadFixture(): ReturnType<typeof normalizeFrontmatter> {
	const source = readFileSync(legacyFixture, "utf8");
	const { data } = matter(source);
	return normalizeFrontmatter(RawFrontmatterSchema.parse(data));
}

describe("topic precedence", () => {
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

	it("prefers tags over categories", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			tags: ["ethics"],
			categories: ["essays"],
			draft: false,
		});
		expect(meta.topics).toEqual(["ethics"]);
	});

	it("falls back to categories when topics and tags are absent", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			categories: ["essays"],
			draft: false,
		});
		expect(meta.topics).toEqual(["essays"]);
	});
});

describe("frontmatter validation", () => {
	it("rejects frontmatter without a title", () => {
		expect(() =>
			normalizeFrontmatter({
				title: "",
				date: "2020-05-14",
				draft: false,
			}),
		).toThrow();
	});

	it("rejects frontmatter without a valid date", () => {
		expect(() =>
			normalizeFrontmatter({
				title: "On Privacy",
				date: "not-a-date",
				draft: false,
			}),
		).toThrow();
	});
});

describe("legacy Hugo fixture", () => {
	it("normalizes the real Hugo header shape", () => {
		const meta = loadFixture();
		expect(meta.title).toBe("Analysis: Justified True Belief as Knowledge?");
		expect(meta.topics).toEqual(["philosophy", "essay", "knowledge", "belief"]);
		expect(meta.date.toISOString()).toBe("2019-08-11T13:19:31.000Z");
		expect(meta.philosophers).toEqual([]);
		expect(meta.description).toBeUndefined();
		expect(meta.draft).toBe(false);
	});

	it("never forwards legacy presentation fields to EssayMeta", () => {
		const meta = loadFixture();
		expect(meta).not.toHaveProperty("author");
		expect(meta).not.toHaveProperty("toc");
		expect(meta).not.toHaveProperty("type");
		expect(meta).not.toHaveProperty("images");
		expect(meta).not.toHaveProperty("tags");
		expect(meta).not.toHaveProperty("categories");
	});
});
