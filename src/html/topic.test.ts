import { describe, expect, it } from "vitest";
import type { Essay } from "../content.js";
import { topicPage } from "./topic.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Privacy",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["ethics", "privacy"],
		philosophers: ["Kant"],
		draft: false,
		slug: "on-privacy",
		html: "<p>Body.</p>",
		sourcePath: "content/essays/on-privacy.md",
		...overrides,
	};
}

describe("topicPage", () => {
	it("uses the shared content column like other index pages", () => {
		const html = topicPage("ethics", [sampleEssay()]);
		expect(html).toContain('<div class="wrap topic-page">');
	});

	it("lists only essays tagged with the topic", () => {
		const tagged = sampleEssay();
		const untagged = sampleEssay({
			slug: "on-time",
			title: "On Time",
			topics: ["time"],
		});
		const html = topicPage("ethics", [tagged, untagged]);
		expect(html).toContain("On Privacy");
		expect(html).not.toContain("On Time");
	});

	it("renders full entries with links and dates", () => {
		const html = topicPage("ethics", [sampleEssay()]);
		expect(html).toContain('href="/essays/on-privacy/"');
		expect(html).toContain("14 May 2020");
	});

	it("escapes the topic heading", () => {
		const html = topicPage("<ethics>", [sampleEssay({ topics: ["<ethics>"] })]);
		expect(html).toContain("<h1>&lt;ethics&gt;</h1>");
		expect(html).not.toContain("<h1><ethics></h1>");
	});
});
