import { describe, expect, it } from "vitest";
import type { Essay } from "../content.js";
import { formatDate, homePage } from "./index.js";

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

describe("formatDate", () => {
	it("formats as day month year", () => {
		expect(formatDate(new Date("2026-09-16T00:00:00Z"))).toBe("16 Sep 2026");
	});

	it("uses UTC fields regardless of local timezone", () => {
		expect(formatDate(new Date("2020-01-01T00:00:00Z"))).toBe("1 Jan 2020");
	});
});

describe("homePage", () => {
	it("renders a hero visual container outside the accessibility tree", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('class="hero-visual" aria-hidden="true"');
	});

	it("lists recent real essays with metadata", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain("On Privacy");
		expect(html).toContain("A short description.");
		expect(html).toContain("ethics · privacy");
		expect(html).toContain("14 May 2020");
	});

	it("links the essays index, not an about page that does not exist", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('href="/essays/"');
		expect(html).not.toContain("About");
	});
});

describe("stylesheets", () => {
	it("links the shared and hero stylesheets on the homepage", () => {
		const html = homePage([sampleEssay()]);
		expect(html).toContain('<link rel="stylesheet" href="/styles.css">');
		expect(html).toContain('<link rel="stylesheet" href="/hero.css">');
	});
});
