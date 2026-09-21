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
		slug: "on-privacy",
		html: "<p>Body.</p>",
		sourcePath: "content/essays/on-privacy.md",
	};
}

describe("essayPage", () => {
	it("constrains the article to the shared content column", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain('<div class="wrap"><article class="prose">');
	});

	it("uses the essay description as the meta description", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain(
			'<meta name="description" content="A short description.">',
		);
	});

	it("omits the meta description when the essay has none", () => {
		const html = essayPage({ ...sampleEssay(), description: undefined });
		expect(html).not.toContain('<meta name="description"');
	});

	it("labels a draft in the header before the title", () => {
		const html = essayPage({ ...sampleEssay(), draft: true });
		expect(html).toContain(
			'<header>\n<p class="draft-eyebrow">Draft</p>\n<h1>On Privacy</h1>',
		);
	});

	it("shows no draft label on a published essay", () => {
		expect(essayPage(sampleEssay())).not.toContain("draft-eyebrow");
	});

	it("links the shared and prose stylesheets", () => {
		const html = essayPage(sampleEssay());
		expect(html).toContain('<link rel="stylesheet" href="/css/main.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/header.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/prose.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/diagrams.css">');
	});
});
