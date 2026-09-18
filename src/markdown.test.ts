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
