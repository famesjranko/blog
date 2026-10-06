import { describe, expect, it } from "vitest";
import type { Essay } from "../content.js";
import { essayPage } from "./essay.js";

function sampleEssay(): Essay {
	return {
		title: "On Privacy",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["ethics", "privacy"],
		philosophers: ["Kant"],
		featured: false,
		draft: false,
		section: "essays",
		slug: "on-privacy",
		html: "<p>Body.</p>",
		readingMinutes: 3,
		images: [],
		sourcePath: "content/essays/on-privacy.md",
	};
}

describe("essayPage", registerEssayTests);

function registerEssayTests(): void {
	registerContentColumnTest();
	registerDescriptionTest();
	registerSocialImageTest();
	registerMissingDescriptionTest();
	registerDraftLabelTest();
	registerPublishedLabelTest();
	registerNoteHeaderTest();
	registerStylesheetOrderTest();
	registerReadingTimeTest();
}

function registerReadingTimeTest(): void {
	it("shows the estimate near the essay title", () => {
		// Given an essay with a three minute reading estimate.
		const essay = sampleEssay();

		// When its page is rendered.
		const html = essayPage(essay);

		// Then the shared metadata line shows its type, year, and estimate.
		expect(html).toContain(
			'<p class="article-meta">Essay <span aria-hidden="true">·</span> <time datetime="2020-05-14">2020</time> <span aria-hidden="true">·</span> 3 min read</p>\n<h1>On Privacy</h1>',
		);
	});
}

function registerContentColumnTest(): void {
	it("constrains the article to the shared content column", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain('<div class="wrap"><article class="prose essay">');
	});
}

function registerDescriptionTest(): void {
	it("uses the essay description as the meta description", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain(
			'<meta name="description" content="A short description.">',
		);
	});
}

function registerSocialImageTest(): void {
	it("uses the essay image for social sharing", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain(
			"https://andrewjmcdonald.com/img/placeholders/on-privacy.jpg",
		);
		expect(html).toContain('<meta property="og:type" content="article">');
	});
}

function registerMissingDescriptionTest(): void {
	it("omits the meta description when the essay has none", () => {
		const html = essayPage({ ...sampleEssay(), description: undefined });
		expect(html).not.toContain('<meta name="description"');
	});
}

function registerDraftLabelTest(): void {
	it("labels a draft in the header before the title", () => {
		// Given a draft essay.
		const essay = { ...sampleEssay(), draft: true };

		// When its page is rendered.
		const html = essayPage(essay);

		// Then the draft badge precedes the common article metadata.
		expect(html).toContain(
			'<header>\n<p class="article-meta"><span class="draft-eyebrow">Draft</span>Essay',
		);
	});
}

function registerPublishedLabelTest(): void {
	it("shows no draft label on a published essay", () => {
		expect(essayPage(sampleEssay())).not.toContain("draft-eyebrow");
	});
}

function registerNoteHeaderTest(): void {
	it("identifies notes in the shared article header", () => {
		// Given an essay-model piece in the notes section.
		const note = { ...sampleEssay(), section: "notes" as const };

		// When its page is rendered.
		const html = essayPage(note);

		// Then the article identifies itself as a note and loads note styles.
		expect(html).toContain('<article class="prose essay note">');
		expect(html).toContain('<p class="article-meta">Note ');
		expect(html).toContain('<link rel="stylesheet" href="/css/notes.css">');
	});
}

function registerStylesheetOrderTest(): void {
	it("links ordered shared, essay, and diagram styles", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain('<link rel="stylesheet" href="/css/main.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/header.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/prose.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/figures.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/essay.css">');
		expect(html).toContain(
			'<link rel="stylesheet" href="/css/essay-patterns.css">',
		);
		expect(html).toContain(
			'<link rel="stylesheet" href="/css/essay-discussion.css">',
		);
		expect(html).toContain('<link rel="stylesheet" href="/css/diagrams.css">');
		expect(html.indexOf("essay.css")).toBeLessThan(
			html.indexOf("essay-patterns.css"),
		);
		expect(html.indexOf("essay-patterns.css")).toBeLessThan(
			html.indexOf("essay-discussion.css"),
		);
		expect(html.indexOf("essay-discussion.css")).toBeLessThan(
			html.indexOf("diagrams.css"),
		);
		expect(html).not.toContain("/css/project.css");
	});
}
