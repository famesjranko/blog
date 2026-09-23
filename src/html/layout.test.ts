import { describe, expect, it, vi } from "vitest";
import {
	type CoverPiece,
	cardClass,
	cardCover,
	footer,
	header,
	page,
} from "./layout.js";

function piece(
	cover: string | undefined,
	coverAlt: string | undefined,
	slug: string,
	draft = false,
): CoverPiece {
	return { cover, coverAlt, slug, draft };
}

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

	it("loads the mobile navigation handler using the site base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			expect(page({ title: "t", content: "" })).toContain(
				'<script src="/blog/js/mobile-nav.js" defer></script>',
			);
		} finally {
			vi.unstubAllEnvs();
		}
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

describe("social metadata", () => {
	it("uses the public domain and a large image card for an article", () => {
		const html = page({
			title: "On Mind",
			content: "",
			description: "A short description.",
			canonicalPath: "/essays/on-mind/",
			socialImage: "/img/essays/on-mind/cover.jpg",
			socialImageAlt: "A cover image.",
			socialType: "article",
		});
		expect(html).toContain(
			'<link rel="canonical" href="https://andrewjmcdonald.com/essays/on-mind/">',
		);
		expect(html).toContain(
			'<meta property="og:image" content="https://andrewjmcdonald.com/img/essays/on-mind/cover.jpg">',
		);
		expect(html).toContain('<meta property="og:type" content="article">');
		expect(html).toContain(
			'<meta name="twitter:card" content="summary_large_image">',
		);
	});

	it("does not derive canonical URLs from a fallback base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = page({
				title: "Essays",
				content: "",
				canonicalPath: "/essays/",
			});
			expect(html).toContain("https://andrewjmcdonald.com/essays/");
			expect(html).not.toContain("andrewjmcdonald.com/blog/");
		} finally {
			vi.unstubAllEnvs();
		}
	});
});

describe("cardCover dimensions", () => {
	it("sizes a shipped cover image", () => {
		const html = cardCover(
			piece("/img/projects/connect4-lisp-web/cover.jpg", "c", "c"),
		);
		expect(html).toContain('width="1536" height="1024"');
	});

	it("leaves an unknown cover unsized", () => {
		const html = cardCover(piece("/img/essays/x/cover.jpg", "x", "x"));
		expect(html).not.toContain("width=");
	});
});

describe("cardCover responsive sources", () => {
	it("puts AVIF before WebP with matching candidates and sizes", () => {
		const html = cardCover(
			piece(
				"/img/essays/dreyfus-review/cover.jpg",
				"transformations",
				"dreyfus-review",
			),
		);
		expect(html).toContain("<picture>");
		const sizes =
			"(min-width: 73rem) 33.25rem, (min-width: 62.5rem) calc(50vw - 3.25rem), (min-width: 42rem) calc(46vw - 0.75rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";
		const avif =
			'<source type="image/avif" srcset="/img/essays/dreyfus-review/cover.card-480w.avif 480w, /img/essays/dreyfus-review/cover.card-720w.avif 720w, /img/essays/dreyfus-review/cover.card-944w.avif 944w"';
		const webp =
			'<source type="image/webp" srcset="/img/essays/dreyfus-review/cover.card-480w.webp 480w, /img/essays/dreyfus-review/cover.card-720w.webp 720w, /img/essays/dreyfus-review/cover.card-944w.webp 944w"';
		expect(html).toContain(`${avif} sizes="${sizes}">`);
		expect(html).toContain(`${webp} sizes="${sizes}">`);
		expect(html.indexOf(avif)).toBeLessThan(html.indexOf(webp));
		expect(html).toContain('src="/img/essays/dreyfus-review/cover.jpg"');
		expect(html).toContain('width="1313" height="533"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('decoding="async"');
	});

	it("prefixes every candidate and the fallback with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover(
				piece("/img/essays/dreyfus-review/cover.jpg", "x", "x"),
			);
			expect(html).toContain(
				'srcset="/blog/img/essays/dreyfus-review/cover.card-480w.avif 480w',
			);
			expect(html).toContain(
				", /blog/img/essays/dreyfus-review/cover.card-944w.webp 944w",
			);
			expect(html).toContain('src="/blog/img/essays/dreyfus-review/cover.jpg"');
		} finally {
			vi.unstubAllEnvs();
		}
	});
});

describe("cardCover compatibility", () => {
	it("keeps the full-size WebP path for an unknown JPEG", () => {
		const html = cardCover(piece("/img/essays/x/cover.jpg", "x", "x"));
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/essays/x/cover.webp">',
		);
		expect(html).not.toContain('type="image/avif"');
	});

	it("leaves png covers as plain img elements", () => {
		const html = cardCover(piece("/img/essays/x/table1.png", "t", "x"));
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/essays/x/table1.png"');
	});

	it("leaves svg covers as plain img elements", () => {
		const html = cardCover(piece("/img/projects/c/diagram.svg", "d", "c"));
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
			piece("/img/essays/jtb-knowledge/cover.jpg", "jtb", "jtb-knowledge"),
		);
		expect(html).toContain('class="card-media"');
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('alt="jtb"');
		expect(html).toContain('loading="lazy"');
	});

	it("falls back to the slug's rendered placeholder with an empty alt", () => {
		const html = cardCover(piece(undefined, undefined, "other"));
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/placeholders/other.webp">',
		);
		expect(html).toContain('<img src="/img/placeholders/other.jpg" alt=""');
		expect(html).not.toContain("card-media--placeholder");
	});

	it("ignores coverAlt when the cover itself is absent", () => {
		const html = cardCover(piece(undefined, "described", "other"));
		expect(html).toContain('alt=""');
		expect(html).not.toContain("described");
	});

	it("emits the placeholder's size once it is in the table", () => {
		// tablescan ships a rendered placeholder, so its size is known.
		const html = cardCover(piece(undefined, undefined, "tablescan"));
		expect(html).toContain('width="640" height="360"');
	});

	it("prefixes the placeholder path under BASE_PATH", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover(piece(undefined, undefined, "other"));
			expect(html).toContain('src="/blog/img/placeholders/other.jpg"');
			expect(html).toContain('srcset="/blog/img/placeholders/other.webp"');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("escapes cover alt text", () => {
		const html = cardCover(piece("/img/x.jpg", "<evil>", "x"));
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
	});
});

describe("draft marking", () => {
	it("overlays a draft badge on the art of a draft", () => {
		const html = cardCover(piece(undefined, undefined, "other", true));
		expect(html).toContain('<span class="draft-badge">Draft</span></div>');
		expect(html.indexOf("</picture>")).toBeLessThan(
			html.indexOf("draft-badge"),
		);
	});

	it("badges a draft with an explicit cover too", () => {
		const html = cardCover(piece("/img/x.png", "x", "x", true));
		expect(html).toContain('<img src="/img/x.png"');
		expect(html).toContain("draft-badge");
	});

	it("leaves published art unbadged", () => {
		expect(cardCover(piece(undefined, undefined, "other"))).not.toContain(
			"draft",
		);
	});

	it("adds the card modifier only for drafts", () => {
		expect(cardClass({ draft: true })).toBe("card card-draft");
		expect(cardClass({ draft: false })).toBe("card");
	});
});
