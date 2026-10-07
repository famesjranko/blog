import { afterEach, describe, expect, it, vi } from "vitest";
import { baseHtmlPaths } from "./markdownLinks.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("baseHtmlPaths", () => {
	it("leaves external and protocol-relative paths alone", () => {
		// Given a site deployed under /blog.
		vi.stubEnv("BASE_PATH", "/blog");

		// When raw HTML with external and protocol-relative paths is rewritten.
		const html = baseHtmlPaths(
			'<a href="https://example.com/watch"><img src="//example.com/x.jpg" alt="x"></a>',
		);

		// Then neither path gains the base path.
		expect(html).toBe(
			'<a href="https://example.com/watch"><img src="//example.com/x.jpg" alt="x"></a>',
		);
	});

	it("leaves look-alike attributes such as data-src alone", () => {
		// Given a site deployed under /blog.
		vi.stubEnv("BASE_PATH", "/blog");

		// When raw HTML carries root-relative data-src and data-href values.
		const html = baseHtmlPaths(
			'<a data-href="/projects/x/"><img data-src="/img/x.jpg" alt="x"></a>',
		);

		// Then neither value gains the base path.
		expect(html).toBe(
			'<a data-href="/projects/x/"><img data-src="/img/x.jpg" alt="x"></a>',
		);
	});
});
