import { describe, expect, it } from "vitest";
import type { Essay, Project } from "../content.js";
import {
	essayEntry,
	essayIndexPage,
	extractCover,
	formatDate,
	homePage,
} from "./index.js";

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

describe("formatDate", () => {
	it("formats as day month year", () => {
		expect(formatDate(new Date("2026-09-16T00:00:00Z"))).toBe("16 Sep 2026");
	});

	it("uses UTC fields regardless of local timezone", () => {
		expect(formatDate(new Date("2020-01-01T00:00:00Z"))).toBe("1 Jan 2020");
	});
});

describe("homePage hero", () => {
	it("renders a hero visual container outside the accessibility tree", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('class="hero-visual" aria-hidden="true"');
	});

	it("links the essays index, not an about page that does not exist", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('href="/essays/"');
		expect(html).not.toContain("About");
	});
});

describe("homePage featured essays", () => {
	it("lists the featured essays with metadata", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain("Featured essays");
		expect(html).toContain("On Privacy");
		expect(html).toContain("A short description.");
		expect(html).toContain("14 May 2020");
	});

	it("shows two featured essays", () => {
		const html = homePage([
			sampleEssay(),
			sampleEssay({ slug: "other", title: "Other" }),
		]);
		expect(html).toContain("On Privacy");
		expect(html).toContain("Other");
	});

	it("puts the flagged essay first and backfills the second slot", () => {
		const html = homePage([
			sampleEssay({ slug: "new", title: "New" }),
			sampleEssay({
				slug: "middle",
				title: "Middle",
				date: new Date("2019-06-01T00:00:00Z"),
			}),
			sampleEssay({
				slug: "pick",
				title: "Pick",
				date: new Date("2019-01-01T00:00:00Z"),
				featured: true,
			}),
		]);
		expect(html).toContain("Pick");
		expect(html).toContain("New");
		expect(html).not.toContain(">Middle</a>");
	});

	it("links onward to the full essays index", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain("More essays");
		expect(html).toContain('href="/essays/"');
	});
});

describe("homePage topic links", () => {
	it("links entry topics to their slugified topic pages", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('href="/topics/ethics/"');
		expect(html).toContain('href="/topics/privacy/"');
	});

	it("slugifies topic links with spaces and capitals", () => {
		const html = homePage([sampleEssay({ topics: ["Philosophy of Mind"] })]);
		expect(html).toContain('href="/topics/philosophy-of-mind/"');
		expect(html).toContain(">Philosophy of Mind</a>");
	});
});

describe("stylesheets", () => {
	it("links the shared and hero stylesheets on the homepage", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('<link rel="stylesheet" href="/styles.css">');
		expect(html).toContain('<link rel="stylesheet" href="/hero.css">');
	});
});

describe("extractCover", () => {
	it("returns the first image source and alt text", () => {
		const html =
			'<p><img src="/img/jtb_knowledge.jpg" alt="jtb"></p><p><img src="/img/other.jpg" alt="other"></p>';
		expect(extractCover(html)).toEqual({
			src: "/img/jtb_knowledge.jpg",
			alt: "jtb",
		});
	});

	it("returns undefined when there is no image", () => {
		expect(extractCover("<p>Body.</p>")).toBeUndefined();
	});

	it("returns undefined when the image has no usable source", () => {
		expect(extractCover('<p><img alt="no source"></p>')).toBeUndefined();
		expect(extractCover('<p><img src="" alt="empty"></p>')).toBeUndefined();
	});

	it("defaults missing alt text to an empty string", () => {
		expect(extractCover('<p><img src="/img/cave_plato.jpg"></p>')).toEqual({
			src: "/img/cave_plato.jpg",
			alt: "",
		});
	});
});

describe("essayEntry", () => {
	it("renders a card with a lazy-loaded cover from the lead image", () => {
		const html = essayEntry(
			sampleEssay({
				html: '<p><img src="/img/jtb_knowledge.jpg" alt="jtb"></p>',
			}),
		);
		expect(html).toContain('<article class="card">');
		expect(html).toContain('class="card-media"');
		expect(html).toContain('src="/img/jtb_knowledge.jpg"');
		expect(html).toContain('loading="lazy"');
	});

	it("omits the cover block when the essay has no image", () => {
		const html = essayEntry(sampleEssay());
		expect(html).toContain('<article class="card">');
		expect(html).not.toContain("card-media");
		expect(html).toContain("On Privacy");
	});

	it("escapes cover alt text", () => {
		const html = essayEntry(
			sampleEssay({
				html: '<p><img src="/img/x.jpg" alt="<evil>"></p>',
			}),
		);
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
	});
});

describe("essayIndexPage", () => {
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

	it("renders the featured card on the homepage", () => {
		const html = homePage([
			sampleEssay({
				html: '<p><img src="/img/jtb_knowledge.jpg" alt="jtb"></p>',
			}),
		]);
		expect(html).toContain('<ol class="card-grid">');
		expect(html).toContain('class="card-media"');
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
		draft: false,
		slug: "connect4-lisp-web",
		html: "<p>Body.</p>",
		sourcePath: "content/projects/connect4-lisp-web.md",
		...overrides,
	};
}

describe("homePage projects", () => {
	it("links the projects index from the hero", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('href="/projects/"');
	});

	it("lists the featured projects when present", () => {
		const html = homePage(
			[sampleEssay()],
			[sampleProject(), sampleProject({ slug: "other", title: "Other" })],
		);
		expect(html).toContain("Featured projects");
		expect(html).toContain("Connect-4 web");
		expect(html).toContain("Other");
		expect(html).toContain("Personal project");
		expect(html).toContain("More projects");
	});

	it("omits the projects section when there are none", () => {
		const html = homePage([sampleEssay()]);
		expect(html).not.toContain("Featured projects");
	});
});
