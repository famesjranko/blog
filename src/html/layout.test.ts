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
			'<button class="theme-toggle" type="button" data-theme-toggle aria-label="Dark theme">',
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
		expect(html).toContain('<script src="/js/theme.js" defer></script>');
	});
});

describe("skip link", () => {
	it("offers a skip link before the header that targets main", () => {
		const html = page({ title: "t", content: "<p>x</p>" });
		expect(html).toContain('<a class="skip-link" href="#main">');
		expect(html).toContain('<main id="main">');
		expect(html.indexOf("skip-link")).toBeLessThan(
			html.indexOf('<header class="site-header">'),
		);
	});
});

describe("feed discovery", () => {
	it("advertises the rss feed from every page head", () => {
		const html = page({ title: "t", content: "" });
		expect(html).toContain(
			'<link rel="alternate" type="application/rss+xml" title="Andrew J. McDonald" href="/rss.xml">',
		);
		expect(html.indexOf("application/rss+xml")).toBeLessThan(
			html.indexOf("<body>"),
		);
	});

	it("prefixes the feed link with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			expect(page({ title: "t", content: "" })).toContain(
				'href="/blog/rss.xml"',
			);
		} finally {
			vi.unstubAllEnvs();
		}
	});
});

describe("cardCover dimensions", () => {
	it("sizes a shipped cover image", () => {
		const html = cardCover(
			"/img/projects/connect4-lisp-web/cover.jpg",
			"c",
			"c",
		);
		expect(html).toContain('width="1536" height="1024"');
	});

	it("leaves an unknown cover unsized", () => {
		const html = cardCover("/img/essays/x/cover.jpg", "x", "x");
		expect(html).not.toContain("width=");
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

	it("falls back to the slug's rendered placeholder with an empty alt", () => {
		const html = cardCover(undefined, undefined, "other");
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/placeholders/other.webp">',
		);
		expect(html).toContain('<img src="/img/placeholders/other.jpg" alt=""');
		expect(html).not.toContain("card-media--placeholder");
	});

	it("ignores coverAlt when the cover itself is absent", () => {
		const html = cardCover(undefined, "described", "other");
		expect(html).toContain('alt=""');
		expect(html).not.toContain("described");
	});

	it("emits the placeholder's size once it is in the table", () => {
		// tablescan ships a rendered placeholder, so its size is known.
		const html = cardCover(undefined, undefined, "tablescan");
		expect(html).toContain('width="640" height="360"');
	});

	it("prefixes the placeholder path under BASE_PATH", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover(undefined, undefined, "other");
			expect(html).toContain('src="/blog/img/placeholders/other.jpg"');
			expect(html).toContain('srcset="/blog/img/placeholders/other.webp"');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("escapes cover alt text", () => {
		const html = cardCover("/img/x.jpg", "<evil>", "x");
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
	});
});
