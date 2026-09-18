import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";

describe("renderMarkdown", () => {
	it("renders headings and paragraphs", () => {
		const html = renderMarkdown("# Hello\n\nWorld.");
		expect(html).toContain("<h1>Hello</h1>");
		expect(html).toContain("<p>World.</p>");
	});
});
