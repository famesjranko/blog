import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import {
	normalizeFrontmatter,
	normalizeProjectFrontmatter,
	RawFrontmatterSchema,
} from "./schema.js";

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

describe("project origin", () => {
	it("defaults origin to personal when absent", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Musicmeta",
			date: "2026-03-20",
			draft: false,
		});
		expect(meta.origin).toBe("personal");
		expect(meta.stack).toEqual([]);
		expect(meta.draft).toBe(false);
	});

	it("keeps an explicit university origin", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Connect-4 heuristic",
			date: "2018-10-15",
			origin: "university",
			draft: false,
		});
		expect(meta.origin).toBe("university");
	});

	it("rejects an unknown origin instead of guessing", () => {
		expect(() =>
			normalizeProjectFrontmatter({
				title: "Something",
				date: "2026-01-01",
				origin: "coursework",
				draft: false,
			}),
		).toThrow();
	});
});

describe("project stack", () => {
	it("falls back to Hugo tags for the stack", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Connect-4 heuristic",
			date: "2018-10-15",
			tags: ["lisp", "heuristic"],
			draft: false,
		});
		expect(meta.stack).toEqual(["lisp", "heuristic"]);
	});

	it("prefers stack over Hugo tags", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Connect-4 web",
			date: "2026-03-15",
			stack: ["sbcl", "redis"],
			tags: ["lisp"],
			draft: false,
		});
		expect(meta.stack).toEqual(["sbcl", "redis"]);
	});
});

describe("project links", () => {
	it("keeps repo and predecessor links", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Connect-4 web",
			date: "2026-03-15",
			repo: "https://github.com/famesjranko/Connect4-Lisp-Web",
			predecessor: "connect4-heuristic",
			draft: false,
		});
		expect(meta.repo).toContain("Connect4-Lisp-Web");
		expect(meta.predecessor).toBe("connect4-heuristic");
	});

	it("rejects a non-URL repo", () => {
		expect(() =>
			normalizeProjectFrontmatter({
				title: "Something",
				date: "2026-01-01",
				repo: "not-a-url",
				draft: false,
			}),
		).toThrow();
	});

	it("never forwards legacy presentation fields to ProjectMeta", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Something",
			date: "2026-01-01",
			tags: ["lisp"],
			author: "Andrew McDonald",
			toc: false,
			type: ["projects", "project"],
			draft: false,
		});
		expect(meta).not.toHaveProperty("author");
		expect(meta).not.toHaveProperty("toc");
		expect(meta).not.toHaveProperty("type");
		expect(meta).not.toHaveProperty("tags");
	});
});

describe("essay cover fields", () => {
	it("keeps an explicit essay cover and alt", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			cover: "/img/essays/on-privacy/cover.jpg",
			coverAlt: "privacy",
			draft: false,
		});
		expect(meta.cover).toBe("/img/essays/on-privacy/cover.jpg");
		expect(meta.coverAlt).toBe("privacy");
	});

	it("leaves essay covers undefined when absent", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			draft: false,
		});
		expect(meta.cover).toBeUndefined();
		expect(meta.coverAlt).toBeUndefined();
	});

	it("rejects an empty essay cover", () => {
		expect(() =>
			normalizeFrontmatter({
				title: "On Privacy",
				date: "2020-05-14",
				cover: "",
				draft: false,
			}),
		).toThrow();
	});
});

describe("project cover fields", () => {
	it("keeps an explicit project cover and alt", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Something",
			date: "2026-01-01",
			cover: "/img/projects/something/cover.jpg",
			coverAlt: "something",
			draft: false,
		});
		expect(meta.cover).toBe("/img/projects/something/cover.jpg");
		expect(meta.coverAlt).toBe("something");
	});

	it("leaves project covers undefined when absent", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Something",
			date: "2026-01-01",
			draft: false,
		});
		expect(meta.cover).toBeUndefined();
		expect(meta.coverAlt).toBeUndefined();
	});
});

describe("featured flag", () => {
	it("defaults essays to unfeatured", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			draft: false,
		});
		expect(meta.featured).toBe(false);
	});

	it("keeps a featured essay", () => {
		const meta = normalizeFrontmatter({
			title: "On Privacy",
			date: "2020-05-14",
			featured: true,
			draft: false,
		});
		expect(meta.featured).toBe(true);
	});

	it("defaults projects to unfeatured", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Something",
			date: "2026-01-01",
			draft: false,
		});
		expect(meta.featured).toBe(false);
	});

	it("keeps a featured project", () => {
		const meta = normalizeProjectFrontmatter({
			title: "Something",
			date: "2026-01-01",
			featured: true,
			draft: false,
		});
		expect(meta.featured).toBe(true);
	});
});
