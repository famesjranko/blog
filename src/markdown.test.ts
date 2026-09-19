import { afterEach, describe, expect, it, vi } from "vitest";
import { renderMarkdown } from "./markdown.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("renderMarkdown", () => {
	it("renders headings and paragraphs", () => {
		const html = renderMarkdown("# Hello\n\nWorld.");
		expect(html).toContain("<h1>Hello</h1>");
		expect(html).toContain("<p>World.</p>");
	});
});

describe("blockquote attributions", () => {
	it("tags a trailing parenthetical citation", () => {
		const html = renderMarkdown("> A claim.\n>\n> (Author 2020).");
		expect(html).toContain('<p class="attribution">(Author 2020).</p>');
	});

	it("leaves a trailing bare word alone", () => {
		const html = renderMarkdown("> A claim.\n>\n> Truth");
		expect(html).not.toContain("attribution");
	});

	it("leaves an ordinary closing sentence alone", () => {
		const html = renderMarkdown("> A claim.\n>\n> Still the claim.");
		expect(html).not.toContain("attribution");
	});

	it("leaves a quote without attribution alone", () => {
		const html = renderMarkdown("> Just a claim.");
		expect(html).not.toContain("attribution");
	});
});

describe("legacy image paths", () => {
	it("leaves root-relative image src alone without a base path", () => {
		const html = renderMarkdown("![watch](/img/plane_propositional.jpg)");
		expect(html).toContain('src="/img/plane_propositional.jpg"');
	});

	it("prefixes root-relative image src with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![watch](/img/plane_propositional.jpg)");
		expect(html).toContain('src="/blog/img/plane_propositional.jpg"');
	});

	it("leaves external images unchanged", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![x](https://example.com/foo.jpg)");
		expect(html).toContain('src="https://example.com/foo.jpg"');
	});

	it("leaves protocol-relative images unchanged", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![x](//example.com/foo.jpg)");
		expect(html).toContain('src="//example.com/foo.jpg"');
	});

	it("leaves relative image paths unchanged", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![x](img/foo.jpg)");
		expect(html).toContain('src="img/foo.jpg"');
	});

	it("does not rewrite link hrefs", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("[x](/essays/something/)");
		expect(html).toContain('href="/essays/something/"');
	});
});

describe("jpeg picture fallback", () => {
	it("wraps internal jpeg images in a picture element with a webp source", () => {
		const html = renderMarkdown("![watch](/img/essays/x/cover.jpg)");
		expect(html).toContain("<picture>");
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/essays/x/cover.webp">',
		);
		expect(html).toContain('src="/img/essays/x/cover.jpg"');
		expect(html).toContain('alt="watch"');
	});

	it("prefixes both the webp source and the fallback with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![watch](/img/essays/x/cover.jpg)");
		expect(html).toContain('srcset="/blog/img/essays/x/cover.webp"');
		expect(html).toContain('src="/blog/img/essays/x/cover.jpg"');
	});

	it("does not lazy-load markdown images", () => {
		const html = renderMarkdown("![watch](/img/essays/x/cover.jpg)");
		expect(html).not.toContain('loading="lazy"');
	});
});

describe("figure captions", () => {
	it("promotes the image title to a visible figure caption", () => {
		const html = renderMarkdown('![watch](/img/essays/x/cover.jpg "My title")');
		expect(html).toContain("<picture>");
		expect(html).toContain("<figure>");
		expect(html).toContain("<figcaption>My title</figcaption>");
		expect(html).not.toContain('title="My title"');
		expect(html).toContain('src="/img/essays/x/cover.jpg"');
	});

	it("renders caption markdown inside the figcaption", () => {
		const html = renderMarkdown('![diagram](/img/x/d.svg "**Bold** caption")');
		expect(html).toContain(
			"<figcaption><strong>Bold</strong> caption</figcaption>",
		);
	});

	it("breaks caption lines on a trailing backslash", () => {
		const html = renderMarkdown(
			'![d](/img/x/d.svg "**One**: first.\\\n**Two**: second.")',
		);
		expect(html).toContain(
			"<figcaption><strong>One</strong>: first.<br>\n<strong>Two</strong>: second.</figcaption>",
		);
	});

	it("leaves untitled images outside any figure", () => {
		const html = renderMarkdown("![table](/img/essays/x/table1.png)");
		expect(html).not.toContain("<figure>");
		expect(html).not.toContain("<figcaption>");
	});

	it("emits a bare figure without a paragraph wrapper", () => {
		const html = renderMarkdown('![d](/img/x/d.svg "**Bold** caption")');
		expect(html.startsWith("<figure>")).toBe(true);
		expect(html).not.toContain("</figure></p>");
	});
});

describe("non-jpeg images stay plain", () => {
	it("leaves png images as plain img elements", () => {
		const html = renderMarkdown("![table](/img/essays/x/table1.png)");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/essays/x/table1.png"');
	});

	it("leaves svg images as plain img elements", () => {
		const html = renderMarkdown("![diagram](/img/projects/c/diagram.svg)");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/projects/c/diagram.svg"');
	});

	it("leaves external jpeg images as plain img elements", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const html = renderMarkdown("![x](https://example.com/foo.jpg)");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="https://example.com/foo.jpg"');
	});
});
