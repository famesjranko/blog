import { afterEach, describe, expect, it, vi } from "vitest";
import type { Page } from "../content.js";
import { standalonePage } from "./standalone.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

function samplePage(overrides: Partial<Page> = {}): Page {
	return {
		title: "Agentic engineering",
		description: "How I work with coding agents.",
		slug: "agentic-engineering",
		html: "<p>Body.</p>",
		images: [],
		sourcePath: "content/pages/agentic-engineering.md",
		...overrides,
	};
}

describe("standalonePage article", () => {
	it("renders the eyebrow above the title inside the standalone article", () => {
		// Given a page with an eyebrow.
		const page = samplePage({ eyebrow: "Foundations · Toolkit" });

		// When it is rendered.
		const html = standalonePage(page);

		// Then the article carries the standalone class, the eyebrow precedes the title, and the body follows.
		expect(html).toContain('<article class="prose essay standalone">');
		expect(html).toMatch(
			/<p class="article-meta">Foundations · Toolkit<\/p>\n<h1>Agentic engineering<\/h1>/,
		);
		expect(html).toContain("<p>Body.</p>");
	});

	it("omits the eyebrow line when the page has none", () => {
		// Given a page without an eyebrow.
		const page = samplePage();

		// When it is rendered.
		const html = standalonePage(page);

		// Then the header holds only the title.
		expect(html).not.toContain("article-meta");
		expect(html).toContain("<h1>Agentic engineering</h1>");
	});

	it("loads the standalone stylesheet after the essay styles and the lightbox script", () => {
		// Given a page.
		const page = samplePage();

		// When it is rendered.
		const html = standalonePage(page);

		// Then standalone.css follows essay.css, so its heading rules win, and the lightbox loads.
		const essay = html.indexOf('href="/css/essay.css"');
		const standalone = html.indexOf('href="/css/standalone.css"');
		expect(essay).toBeGreaterThan(-1);
		expect(standalone).toBeGreaterThan(essay);
		expect(html).toContain('<script src="/js/lightbox.js" defer></script>');
	});
});

describe("standalonePage head and navigation", () => {
	it("advertises its canonical URL and description", () => {
		// Given a page with a description.
		const page = samplePage();

		// When it is rendered.
		const html = standalonePage(page);

		// Then the head carries the public URL and the description.
		expect(html).toContain(
			'<link rel="canonical" href="https://andrewjmcdonald.com/agentic-engineering/">',
		);
		expect(html).toContain(
			'<meta name="description" content="How I work with coding agents.">',
		);
	});

	it("links the page from the header navigation under the base path", () => {
		// Given a project-site deployment base path.
		vi.stubEnv("BASE_PATH", "/blog");

		// When a page renders its header.
		const html = standalonePage(samplePage());

		// Then the navigation links to the page under that base path.
		expect(html).toContain(
			'<a href="/blog/agentic-engineering/">Agentic engineering</a>',
		);
	});
});
