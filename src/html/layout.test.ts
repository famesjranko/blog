import { describe, expect, it, vi } from "vitest";
import { cardCover, footer, header, page } from "./layout.js";

describe("footer", () => {
	it("links to the GitHub profile in a new tab", () => {
		const html = footer();
		expect(html).toContain(
			'<a class="footer-link" href="https://github.com/famesjranko" rel="me noopener" target="_blank">',
		);
		expect(html).toContain('<svg class="footer-icon" viewBox="0 0 16 16"');
		expect(html).toContain("</svg>GitHub</a>");
	});
});

describe("theme toggle", () => {
	it("renders a theme toggle button in the header actions", () => {
		const html = header();
		expect(html).toContain('<div class="header-actions">');
		expect(html).toContain(
			'<button class="theme-toggle" type="button" data-theme-toggle aria-label="Toggle colour theme">',
		);
		expect(html.indexOf("theme-toggle")).toBeLessThan(
			html.indexOf("menu-toggle"),
		);
	});

	it("applies the stored theme before stylesheets load", () => {
		const html = page({ title: "t", content: "" });
		const inline = html.indexOf("document.documentElement.dataset.theme");
		expect(inline).toBeGreaterThan(-1);
		expect(html).toContain('localStorage.getItem("theme")');
		expect(inline).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
	});

	it("loads the toggle handler on every page", () => {
		const html = page({ title: "t", content: "" });
		expect(html).toContain('<script src="/theme.js" defer></script>');
	});
});

describe("cardCover webp sidecars", () => {
	it("wraps jpeg covers in a picture element with a webp source", () => {
		const html = cardCover(
			"/img/essays/jtb-knowledge/cover.jpg",
			"jtb",
			"jtb-knowledge",
		);
		expect(html).toContain("<picture>");
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/essays/jtb-knowledge/cover.webp">',
		);
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('decoding="async"');
	});

	it("prefixes both the webp source and the fallback with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover("/img/essays/x/cover.jpg", "x", "x");
			expect(html).toContain('srcset="/blog/img/essays/x/cover.webp"');
			expect(html).toContain('src="/blog/img/essays/x/cover.jpg"');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("leaves png covers as plain img elements", () => {
		const html = cardCover("/img/essays/x/table1.png", "t", "x");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/essays/x/table1.png"');
	});

	it("leaves svg covers as plain img elements", () => {
		const html = cardCover("/img/projects/c/diagram.svg", "d", "c");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/projects/c/diagram.svg"');
	});
});
