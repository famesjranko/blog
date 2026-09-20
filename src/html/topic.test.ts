import { describe, expect, it } from "vitest";
import { type Essay, topicSlug } from "../content.js";
import { allTopics, topicPage } from "./topic.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Privacy",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["ethics", "privacy"],
		philosophers: ["Kant"],
		featured: false,
		draft: false,
		slug: "on-privacy",
		html: "<p>Body.</p>",
		sourcePath: "content/essays/on-privacy.md",
		...overrides,
	};
}

const ethics = { name: "ethics", slug: "ethics" };

describe("topicSlug", () => {
	it("lowercases and hyphenates spaces", () => {
		expect(topicSlug("Philosophy of Mind")).toBe("philosophy-of-mind");
	});

	it("keeps existing hyphens and digits", () => {
		expect(topicSlug("Covid-19")).toBe("covid-19");
	});

	it("turns punctuation into hyphens", () => {
		expect(topicSlug("mind & body")).toBe("mind-body");
	});

	it("throws instead of producing an empty slug", () => {
		expect(() => topicSlug("!!!")).toThrow();
	});
});

describe("allTopics", () => {
	it("returns name and slug entries sorted by slug", () => {
		const entries = allTopics([
			sampleEssay(),
			sampleEssay({
				slug: "on-mind",
				title: "On Mind",
				topics: ["Philosophy of Mind"],
			}),
		]);
		expect(entries).toContainEqual({ name: "ethics", slug: "ethics" });
		expect(entries).toContainEqual({
			name: "Philosophy of Mind",
			slug: "philosophy-of-mind",
		});
		const slugs = entries.map((e) => e.slug);
		expect([...slugs].sort()).toEqual(slugs);
	});

	it("throws when distinct names collapse to one slug", () => {
		const essays = [
			sampleEssay({ topics: ["Covid-19"] }),
			sampleEssay({ slug: "other", title: "Other", topics: ["covid 19"] }),
		];
		expect(() => allTopics(essays)).toThrow(/share slug/);
	});
});

describe("topicPage", () => {
	it("uses the shared content column like other index pages", () => {
		const html = topicPage(ethics, [sampleEssay()]);
		expect(html).toContain('<div class="wrap topic-page">');
	});

	it("lists only essays tagged with the topic", () => {
		const tagged = sampleEssay();
		const untagged = sampleEssay({
			slug: "on-time",
			title: "On Time",
			topics: ["time"],
		});
		const html = topicPage(ethics, [tagged, untagged]);
		expect(html).toContain("On Privacy");
		expect(html).not.toContain("On Time");
	});

	it("groups essays by slug, not exact spelling", () => {
		const variant = sampleEssay({ topics: ["Ethics"] });
		const html = topicPage(ethics, [variant]);
		expect(html).toContain("On Privacy");
	});

	it("renders full entries with links, descriptions, and no dates", () => {
		const html = topicPage(ethics, [sampleEssay()]);
		expect(html).toContain('href="/essays/on-privacy/"');
		expect(html).toContain("A short description.");
		expect(html).not.toContain("<time");
	});

	it("renders entries as cards in a grid", () => {
		const html = topicPage(ethics, [sampleEssay()]);
		expect(html).toContain('<ol class="card-grid">');
		expect(html).toContain('<article class="card">');
	});

	it("nests card titles directly under the topic heading", () => {
		const html = topicPage(ethics, [sampleEssay()]);
		expect(html).toContain('<h2 class="card-title">');
		expect(html).not.toContain("<h3");
	});

	it("escapes the topic heading", () => {
		const entry = { name: "<ethics>", slug: topicSlug("<ethics>") };
		const html = topicPage(entry, [sampleEssay({ topics: ["<ethics>"] })]);
		expect(html).toContain("<h1>&lt;ethics&gt;</h1>");
		expect(html).not.toContain("<h1><ethics></h1>");
	});
});
