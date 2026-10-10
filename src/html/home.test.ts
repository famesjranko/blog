import { describe, expect, it } from "vitest";
import type { Essay, Project } from "../content.js";
import { homePage } from "./home.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Privacy",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["ethics"],
		philosophers: [],
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

function sampleProject(overrides: Partial<Project> = {}): Project {
	return {
		title: "Musicmeta",
		description: "A Kotlin music library.",
		date: new Date("2026-03-21T00:00:00Z"),
		origin: "personal",
		stack: ["kotlin"],
		cover: "/img/projects/musicmeta/cover.jpg",
		coverAlt: "A vinyl record",
		featured: false,
		showcase: false,
		draft: false,
		slug: "musicmeta",
		html: "<p>Body.</p>",
		readingMinutes: 1,
		images: [],
		sourcePath: "content/projects/musicmeta.md",
		...overrides,
	};
}

function sampleNote(overrides: Partial<Essay> = {}): Essay {
	return sampleEssay({
		title: "On Peep Show",
		section: "notes",
		slug: "peep-show",
		date: new Date("2020-07-12T00:00:00Z"),
		...overrides,
	});
}

function content(
	overrides: { essays?: Essay[]; notes?: Essay[]; projects?: Project[] } = {},
) {
	return { essays: [sampleEssay()], notes: [], projects: [], ...overrides };
}

/** The markup of one homepage section, by id. */
function sectionHtml(html: string, id: string): string {
	const start = html.indexOf(`<section id="${id}"`);
	return start === -1
		? ""
		: html.slice(start, html.indexOf("</section>", start));
}

describe("homePage hero", () => {
	it("renders a hero visual container outside the accessibility tree", () => {
		const html = homePage(content());
		expect(html).toContain('class="hero-visual" aria-hidden="true"');
	});

	it("links the essays index, not an about page that does not exist", () => {
		const html = homePage(content());
		expect(html).toContain('href="/essays/"');
		expect(html).not.toContain("About");
	});

	it("renders the thought-field canvas outside the accessibility tree", () => {
		const html = homePage(content());
		expect(html).toContain('data-thought-field aria-hidden="true"');
	});

	it("keeps the CSS wash fallback behind the canvas", () => {
		const html = homePage(content());
		expect(html).toContain('class="hero-visual"');
		expect(html.indexOf("hero-visual")).toBeLessThan(
			html.indexOf("data-thought-field"),
		);
	});

	it("loads the hero field as a deferred-by-default module script", () => {
		const html = homePage(content());
		expect(html).toContain('<script type="module" src="/js/hero.js"></script>');
		expect(html).not.toContain('<script src="/js/hero.js" defer>');
	});
});

describe("homePage hero copy", () => {
	it("renders the eyebrow before the headline", () => {
		// Given the home page.
		const html = homePage(content());

		// Then the eyebrow can wrap only after its separator.
		expect(html).toContain(
			"BACKEND\u00a0&amp;\u00a0SYSTEMS\u00a0ENGINEER\u00a0· MELBOURNE",
		);
		// And it comes before the headline.
		expect(html.indexOf("hero-eyebrow")).toBeLessThan(html.indexOf("<h1>"));
	});

	it("renders the hero headline across two lines", () => {
		const html = homePage(content());
		expect(html).toContain("From philosophy<br>to software<");
	});

	it("renders the personal-collection standfirst", () => {
		const html = homePage(content());
		expect(html).toContain(
			"A personal collection of essays, projects, and notes.",
		);
	});
});

describe("homePage featured", () => {
	it("shows the showcase cover uncropped, from full-shape renditions", () => {
		// Given a project flagged as the showcase.
		const projects = [sampleProject({ showcase: true })];

		// When the homepage renders.
		const featured = sectionHtml(homePage(content({ projects })), "featured");

		// Then the banner serves the cover's aspect-preserving renditions.
		expect(featured).toContain('<article class="showcase">');
		expect(featured).toContain("/img/projects/musicmeta/cover.body-720w.avif");
		// And not the 16:9 card crop.
		expect(featured).not.toContain("musicmeta/cover.card-");
		// And its section and description are shown.
		expect(featured).toContain('<p class="home-label">Projects</p>');
		expect(featured).toContain("A Kotlin music library.");
	});

	it("shows a note pick with its cover art like any other section", () => {
		// Given a project showcase and one note.
		const projects = [sampleProject({ showcase: true })];
		const notes = [sampleNote()];

		// When the homepage renders.
		const featured = sectionHtml(
			homePage(content({ projects, notes })),
			"featured",
		);

		// Then the note is a pick with its placeholder art and section label.
		const pick = featured.slice(featured.indexOf("/notes/peep-show/") - 400);
		expect(pick).toContain('src="/img/placeholders/peep-show.jpg"');
		expect(featured).toContain('<p class="home-label">Notes</p>');
	});
});

describe("homePage latest", () => {
	it("lists each piece with its date, section, and title link", () => {
		// Given a project showcase, four featured essays to fill the picks,
		// and an older essay that is not featured.
		const projects = [sampleProject({ showcase: true })];
		const picked = ["a", "b", "c", "d"].map((slug) =>
			sampleEssay({ slug, featured: true }),
		);
		const older = sampleEssay({
			slug: "older",
			title: "Older",
			date: new Date("2016-07-20T00:00:00Z"),
		});
		const essays = [...picked, older];

		// When the homepage renders.
		const latest = sectionHtml(
			homePage(content({ essays, projects })),
			"latest",
		);

		// Then the older essay is listed with a machine-readable date.
		expect(latest).toContain(
			'<time datetime="2016-07-20">20 Jul 2016</time><span class="latest-section">Essay</span><a href="/essays/older/">Older</a>',
		);
	});
});

describe("homePage skip link", () => {
	it("skips past the hero to the Featured section", () => {
		const html = homePage(content());
		expect(html).toContain('<a class="skip-link" href="#featured">');
		expect(html).toContain('<section id="featured"');
	});

	it("falls back to main and renders no sections without content", () => {
		const html = homePage(content({ essays: [] }));
		expect(html).toContain('<a class="skip-link" href="#main">');
		expect(html).not.toContain("<section id=");
	});
});

describe("homePage stylesheets", () => {
	it("links the shared, hero, and homepage stylesheets", () => {
		const html = homePage(content());
		expect(html).toContain('<link rel="stylesheet" href="/css/main.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/hero.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/home.css">');
	});
});
