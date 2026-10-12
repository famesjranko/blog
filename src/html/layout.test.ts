import { describe, expect, it, vi } from "vitest";
import { footer, header, page } from "./layout.js";

interface Meta {
	name: string;
	content: string;
}

/**
 * Builds the page's head in parser order, running the inline theme
 * script where it appears with `stored` in localStorage, and returns
 * the first color-scheme meta: the one the browser paints from.
 */
function firstColorScheme(stored: string | null) {
	const html = page({ title: "t", content: "" });
	const script = /<script>(.*?)<\/script>/.exec(html);
	const meta = /<meta name="color-scheme" content="([^"]*)">/.exec(html);
	const head: Meta[] = [];
	const root = { dataset: {} as { theme?: string } };
	const document = {
		documentElement: root,
		head: { appendChild: (el: Meta) => head.push(el) },
		createElement: () => ({ name: "", content: "" }),
	};
	const localStorage = { getItem: () => stored };
	const runScript = () =>
		new Function("document", "localStorage", script?.[1] ?? "")(
			document,
			localStorage,
		);
	const staticMeta =
		meta === null ? [] : [{ name: "color-scheme", content: meta[1] ?? "" }];
	if ((script?.index ?? 0) < (meta?.index ?? Number.POSITIVE_INFINITY)) {
		runScript();
		head.push(...staticMeta);
	} else {
		head.push(...staticMeta);
		runScript();
	}
	const first = head.find((el) => el.name === "color-scheme");
	return { content: first?.content, theme: root.dataset.theme };
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

describe("first-paint colour scheme", () => {
	it("declares both colour schemes before any stylesheet", () => {
		// Given any page
		const html = page({ title: "t", content: "" });
		// When the browser paints before main.css arrives
		const meta = html.indexOf(
			'<meta name="color-scheme" content="light dark">',
		);
		// Then the head has already told it the page supports dark
		expect(meta).toBeGreaterThan(-1);
		expect(meta).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
	});

	it("paints the first frames in a stored choice", () => {
		// Given a visitor who chose light
		const { content, theme } = firstColorScheme("light");
		// Then the first color-scheme meta is theirs, whatever the OS prefers
		expect(content).toBe("light");
		expect(theme).toBe("light");
	});

	it("paints the first frames in the OS scheme when nothing is stored", () => {
		// Given a visitor with nothing stored
		const { content, theme } = firstColorScheme(null);
		// Then the page's own meta is first
		expect(content).toBe("light dark");
		expect(theme).toBeUndefined();
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

describe("social image", () => {
	it("gives a page without its own image the site share card", () => {
		// Given a section index page with no image of its own.
		const options = { title: "Essays", content: "", canonicalPath: "/essays/" };

		// When the page is rendered.
		const html = page(options);

		// Then the share card is the site image at its public address.
		expect(html).toContain(
			'<meta property="og:image" content="https://andrewjmcdonald.com/img/share.jpg">',
		);
		// And it is described for screen readers.
		expect(html).toContain(
			'<meta property="og:image:alt" content="From philosophy',
		);
		// And it uses the large image card.
		expect(html).toContain(
			'<meta name="twitter:card" content="summary_large_image">',
		);
	});
});

describe("social image size", () => {
	it("gives the share image size when the image ships with the site", () => {
		// Given a page whose image ships with the site at 1512 by 630.
		const options = {
			title: "Connect-4",
			content: "",
			canonicalPath: "/projects/connect4-lisp-web/",
			socialImage: "/img/projects/connect4-lisp-web/cover.jpg",
		};

		// When the page is rendered.
		const html = page(options);

		// Then the scraper is told the image width.
		expect(html).toContain('<meta property="og:image:width" content="1512">');
		// And the image height.
		expect(html).toContain('<meta property="og:image:height" content="630">');
	});

	it("omits the share image size for an external image", () => {
		// Given a page whose image lives on another site.
		const options = {
			title: "Elsewhere",
			content: "",
			canonicalPath: "/essays/elsewhere/",
			socialImage: "https://example.com/cover.jpg",
		};

		// When the page is rendered.
		const html = page(options);

		// Then the external image is the share image.
		expect(html).toContain(
			'<meta property="og:image" content="https://example.com/cover.jpg">',
		);
		// And no size is claimed for it.
		expect(html).not.toContain("og:image:width");
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
