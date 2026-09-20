import { describe, expect, it } from "vitest";
import type { Essay, Project } from "../content.js";
import { essayEntry, essayIndexPage, homePage } from "./index.js";
import { cardCover, placeholderStyle } from "./layout.js";
import { projectEntry, projectIndexPage } from "./project.js";
import { page } from "./layout.js";

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

	it("renders the thought-field canvas outside the accessibility tree", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('data-thought-field aria-hidden="true"');
	});

	it("keeps the CSS wash fallback behind the canvas", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('class="hero-visual"');
		expect(html.indexOf("hero-visual")).toBeLessThan(
			html.indexOf("data-thought-field"),
		);
	});

	it("loads the hero field as a deferred-by-default module script", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('<script type="module" src="/hero.js"></script>');
		expect(html).not.toContain('<script src="/hero.js" defer>');
	});
});

describe("homePage hero copy", () => {
	it("renders the eyebrow before the headline", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain(
			"ANDREW MCDONALD · BACKEND &amp; SYSTEMS ENGINEER · MELBOURNE",
		);
		expect(html.indexOf("hero-eyebrow")).toBeLessThan(html.indexOf("<h1>"));
	});

	it("renders the hero headline across two lines", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain("From philosophy<br>to software<");
	});

	it("renders the personal-collection standfirst", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain(
			"A personal collection of essays, projects, and notes.",
		);
	});
});

describe("homePage featured essays", () => {
	it("lists the featured essays with descriptions and no dates", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain("Featured essays");
		expect(html).toContain("On Privacy");
		expect(html).toContain("A short description.");
		expect(html).not.toContain("<time");
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
		expect(html).toContain('<link rel="stylesheet" href="/header.css">');
		expect(html).toContain('<link rel="stylesheet" href="/hero.css">');
	});
});

describe("page scripts", () => {
	it("renders classic scripts with defer", () => {
		const html = page({ title: "T", content: "<p>x</p>", scripts: ["/a.js"] });
		expect(html).toContain('<script src="/a.js" defer></script>');
	});

	it("renders module scripts as closed elements without defer", () => {
		const html = page({
			title: "T",
			content: "<p>x</p>",
			scripts: [{ src: "/a.js", type: "module" }],
		});
		expect(html).toContain('<script type="module" src="/a.js"></script>');
	});

	it("links the svg favicon so browsers skip the default ico request", () => {
		const html = page({ title: "T", content: "<p>x</p>" });
		expect(html).toContain(
			'<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
		);
	});
});

describe("cardCover", () => {
	it("renders the explicit cover image with lazy loading", () => {
		const html = cardCover(
			"/img/essays/jtb-knowledge/cover.jpg",
			"jtb",
			"jtb-knowledge",
		);
		expect(html).toContain('class="card-media"');
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('alt="jtb"');
		expect(html).toContain('loading="lazy"');
	});

	it("renders a slug-derived placeholder when no cover is set", () => {
		const html = cardCover(undefined, undefined, "other");
		expect(html).toContain("card-media--placeholder");
		expect(html).toContain(`style="${placeholderStyle("other")}"`);
	});

	it("escapes cover alt text", () => {
		const html = cardCover("/img/x.jpg", "<evil>", "x");
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
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

	it("renders a placeholder cover when no cover is set", () => {
		const html = essayEntry(sampleEssay());
		expect(html).toContain('<article class="card">');
		expect(html).toContain("card-media--placeholder");
		expect(html).toContain("--placeholder-hue:");
		expect(html).toContain("On Privacy");
	});

	it("derives the essay placeholder from the slug", () => {
		const html = essayEntry(sampleEssay({ slug: "other" }));
		expect(html).toContain(`style="${placeholderStyle("other")}"`);
	});

	it("never uses body images for the card", () => {
		const html = essayEntry(
			sampleEssay({ html: '<p><img src="/img/x.jpg" alt="x"></p>' }),
		);
		expect(html).not.toContain('src="/img/x.jpg"');
		expect(html).toContain("card-media--placeholder");
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

describe("placeholderStyle", () => {
	it("is deterministic for the same seed", () => {
		expect(placeholderStyle("musicmeta")).toBe(placeholderStyle("musicmeta"));
	});

	it("differs across slugs", () => {
		expect(placeholderStyle("musicmeta")).not.toBe(
			placeholderStyle("ip-camera"),
		);
	});

	it("emits a hue in range and an offset in range", () => {
		const style = placeholderStyle("musicmeta");
		const hue = Number(/--placeholder-hue: (\d+)/.exec(style)?.[1]);
		const offset = Number(/--placeholder-offset: (\d+)/.exec(style)?.[1]);
		expect(hue).toBeGreaterThanOrEqual(0);
		expect(hue).toBeLessThan(360);
		expect(offset).toBeGreaterThanOrEqual(10);
		expect(offset).toBeLessThanOrEqual(89);
	});

	it("emits unitless numbers so CSS can apply its own units", () => {
		expect(placeholderStyle("musicmeta")).not.toContain("%");
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

	it("uses the shared index shell", () => {
		const html = essayIndexPage([sampleEssay()]);
		expect(html).toContain('<div class="wrap index-page">');
		expect(html).toContain('<p class="index-count">');
	});

	it("renders the featured card on the homepage", () => {
		const html = homePage([
			sampleEssay({
				cover: "/img/essays/jtb-knowledge/cover.jpg",
				coverAlt: "jtb",
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
