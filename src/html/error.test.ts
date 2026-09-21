import { describe, expect, it, vi } from "vitest";
import { errorPage } from "./error.js";

describe("errorPage 404", () => {
	it("titles the page with the status and links the site sections", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = errorPage(404);
		expect(html).toContain("<title>404 — Page not found</title>");
		expect(html).toContain('<p class="hero-eyebrow">404</p>');
		expect(html).toContain('href="/blog/"');
		expect(html).toContain('href="/blog/essays/"');
		expect(html).toContain('href="/blog/projects/"');
		vi.unstubAllEnvs();
	});

	it("renders the hero with the thought field behind the wash", () => {
		const html = errorPage(404);
		expect(html).toContain('<link rel="stylesheet" href="/css/hero.css">');
		expect(html).toContain('<script type="module" src="/js/hero.js"></script>');
		expect(html.indexOf('class="hero-visual"')).toBeLessThan(
			html.indexOf("data-thought-field"),
		);
	});
});

describe("errorPage other statuses", () => {
	it("renders status-specific copy, not a renamed 404", () => {
		const html500 = errorPage(500);
		const html503 = errorPage(503);
		expect(html500).toContain("<title>500 — ");
		expect(html500).toContain('<p class="hero-eyebrow">500</p>');
		expect(html503).toContain("<title>503 — ");
		expect(html503).toContain('<p class="hero-eyebrow">503</p>');
		expect(html500).not.toContain("Page not found");
		expect(html503).not.toContain("Page not found");
		expect(html500).not.toBe(html503);
	});
});
