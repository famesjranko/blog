import { describe, expect, it } from "vitest";
import { titleHtml } from "./titleText.js";

describe("titleHtml", () => {
	it("keeps each hyphenated word in a span that does not wrap", () => {
		// Given a title with a hyphenated word in the middle.
		const title = "A Connect-4 Web Interface";

		// When its markup is built.
		const html = titleHtml(title);

		// Then only the hyphenated word is wrapped.
		expect(html).toBe('A <span class="nowrap">Connect-4</span> Web Interface');
	});

	it("wraps every hyphenated word, at the start and the end", () => {
		// Given hyphenated words at both ends of a title.
		const title = "ESP32-S3 meets COVID-19";

		// When its markup is built.
		const html = titleHtml(title);

		// Then both words are wrapped and the space between stays free.
		expect(html).toBe(
			'<span class="nowrap">ESP32-S3</span> meets <span class="nowrap">COVID-19</span>',
		);
	});

	it("escapes markup inside and outside the wrapped words", () => {
		// Given a title with markup characters next to a hyphenated word.
		const title = "<b> & Self-<i>";

		// When its markup is built.
		const html = titleHtml(title);

		// Then every character is escaped, including the wrapped word.
		expect(html).toBe(
			'&lt;b&gt; &amp; <span class="nowrap">Self-&lt;i&gt;</span>',
		);
	});

	it("leaves a title without hyphens as plain escaped text", () => {
		// Given a title with no hyphen and a lone dash between spaces.
		const title = "Musicmeta - a library";

		// When its markup is built.
		const html = titleHtml(title);

		// Then nothing is wrapped.
		expect(html).toBe("Musicmeta - a library");
	});
});
