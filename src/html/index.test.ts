import { describe, expect, it } from "vitest";
import type { Essay, Project } from "../content.js";
import { essayEntry, essayIndexPage } from "./index.js";
import { projectEntry, projectIndexPage } from "./project.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Privacy",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["ethics", "privacy"],
		philosophers: ["Kant"],
		featured: false,
		showcase: false,
		draft: false,
		section: "essays",
		slug: "on-privacy",
		html: "<p>Body.</p>",
		readingMinutes: 1,
		images: [],
		sourcePath: "content/essays/on-privacy.md",
		...overrides,
	};
}

describe("essayEntry topic links", () => {
	it("links entry topics to their slugified topic pages", () => {
		const html = essayEntry(sampleEssay());
		expect(html).toContain('href="/topics/ethics/"');
		expect(html).toContain('href="/topics/privacy/"');
	});

	it("slugifies topic links with spaces and capitals", () => {
		const html = essayEntry(sampleEssay({ topics: ["Philosophy of Mind"] }));
		expect(html).toContain('href="/topics/philosophy-of-mind/"');
		expect(html).toContain(">Philosophy of Mind</a>");
	});
});

describe("essayEntry cover", () => {
	it("renders a card with the explicit cover image", () => {
		const html = essayEntry(
			sampleEssay({
				cover: "/img/essays/jtb-knowledge/cover.jpg",
				coverAlt: "jtb",
			}),
		);
		expect(html).toContain('<article class="card">');
		expect(html).toContain('class="card-media"');
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('loading="lazy"');
	});

	it("renders the slug's placeholder art when no cover is set", () => {
		const html = essayEntry(sampleEssay());
		expect(html).toContain('<article class="card">');
		expect(html).toContain('src="/img/placeholders/on-privacy.jpg"');
		expect(html).toContain('alt=""');
		expect(html).toContain("On Privacy");
	});

	it("marks a draft card with a modifier class and a badge", () => {
		const html = essayEntry(sampleEssay({ draft: true }));
		expect(html).toContain('<article class="card card-draft">');
		expect(html).toContain('<span class="draft-badge">Draft</span>');
	});

	it("derives the essay placeholder from the slug", () => {
		const html = essayEntry(sampleEssay({ slug: "other" }));
		expect(html).toContain("/img/placeholders/other.jpg");
	});

	it("never uses body images for the card", () => {
		const html = essayEntry(
			sampleEssay({ html: '<p><img src="/img/x.jpg" alt="x"></p>' }),
		);
		expect(html).not.toContain('src="/img/x.jpg"');
		expect(html).toContain("/img/placeholders/on-privacy.jpg");
	});

	it("escapes cover alt text", () => {
		const html = essayEntry(
			sampleEssay({ cover: "/img/x.jpg", coverAlt: "<evil>" }),
		);
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
	});
});

describe("essayEntry content", () => {
	it("omits the description when the essay has none", () => {
		const html = essayEntry(sampleEssay({ description: undefined }));
		expect(html).toContain("On Privacy");
		expect(html).not.toContain("entry-desc");
	});

	it("keeps the facets row even when the essay has no topics", () => {
		const html = essayEntry(sampleEssay({ topics: [] }));
		expect(html).toContain("entry-topics");
	});

	it("renders topics without a date row", () => {
		const html = essayEntry(sampleEssay());
		expect(html).toContain("entry-topics");
		expect(html).not.toContain("<time");
	});
});

describe("essayIndexPage", () => {
	it("emits a meta description for search snippets", () => {
		expect(essayIndexPage([sampleEssay()])).toMatch(
			/<meta name="description" content="[^"]+">/,
		);
	});

	it("renders a two-column card grid with an essay count", () => {
		const html = essayIndexPage([
			sampleEssay(),
			sampleEssay({ slug: "other", title: "Other" }),
		]);
		expect(html).toContain('<ol class="card-grid">');
		expect(html).toContain("2 essays");
	});

	it("uses singular wording for a single essay", () => {
		expect(essayIndexPage([sampleEssay()])).toContain("1 essay");
	});

	it("uses the shared index shell", () => {
		const html = essayIndexPage([sampleEssay()]);
		expect(html).toContain('<div class="wrap index-page">');
		expect(html).toContain('<p class="index-count">');
	});
});

function sampleProject(overrides: Partial<Project> = {}): Project {
	return {
		title: "Connect-4 web",
		description: "A Lisp web service.",
		date: new Date("2026-03-15T00:00:00Z"),
		origin: "personal",
		repo: "https://github.com/famesjranko/Connect4-Lisp-Web",
		stack: ["lisp"],
		predecessor: undefined,
		featured: false,
		showcase: false,
		draft: false,
		slug: "connect4-lisp-web",
		html: "<p>Body.</p>",
		readingMinutes: 1,
		images: [],
		sourcePath: "content/projects/connect4-lisp-web.md",
		...overrides,
	};
}

describe("card heading levels", () => {
	it("nests cards directly under the page heading on index pages", () => {
		for (const html of [
			essayIndexPage([sampleEssay()]),
			projectIndexPage([sampleProject()]),
		]) {
			expect(html).toContain('<h2 class="card-title">');
			expect(html).not.toContain("<h3");
		}
	});
});

describe("index page parity", () => {
	it("gives essays and projects the same shell", () => {
		const pages = [
			essayIndexPage([sampleEssay()]),
			projectIndexPage([sampleProject()]),
		];
		for (const html of pages) {
			expect(html).toContain('<div class="wrap index-page">');
			expect(html).toContain('<p class="index-count">');
			expect(html).toContain('<ol class="card-grid">');
		}
	});

	it("orders card hooks identically in essay and project entries", () => {
		const hooks = [
			"<li><article",
			"card-media",
			"card-body",
			"card-title",
			"entry-desc",
			"entry-meta",
			"entry-topics",
		];
		const entries = [essayEntry(sampleEssay()), projectEntry(sampleProject())];
		for (const html of entries) {
			const at = hooks.map((hook) => html.indexOf(hook));
			expect(Math.min(...at)).toBeGreaterThanOrEqual(0);
			expect([...at].sort((a, b) => a - b)).toEqual(at);
		}
	});
});
