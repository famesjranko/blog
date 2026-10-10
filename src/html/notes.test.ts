import { describe, expect, it } from "vitest";
import type { Essay } from "../content.js";
import { header } from "./layout.js";
import { noteIndexPage } from "./notes.js";

function sampleNote(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Peep Show",
		description: "The first-person camera as phenomenology.",
		date: new Date("2020-07-12T00:00:00Z"),
		topics: ["sartre"],
		philosophers: [],
		featured: false,
		showcase: false,
		draft: false,
		section: "notes",
		slug: "peep-show",
		html: "<p>Body.</p>",
		readingMinutes: 3,
		images: [],
		sourcePath: "content/notes/peep-show.md",
		...overrides,
	};
}

describe("noteIndexPage", () => {
	it("lists each note without article metadata", () => {
		// Given one note with a date and reading time.
		const note = sampleNote();

		// When the notes index renders.
		const html = noteIndexPage([note]);

		// Then the page counts one note.
		expect(html).toContain('<p class="index-count">1 note</p>');
		// And the title links to the note under /notes/.
		expect(html).toContain('<a href="/notes/peep-show/">On Peep Show</a>');
		// And article metadata stays off the index row.
		expect(html).not.toContain("2020 · 3 min");
		expect(html).not.toContain("note-meta");
	});

	it("gives a coverless note its generated placeholder art", () => {
		// Given a note without a cover image.
		const note = sampleNote();

		// When the notes index renders.
		const html = noteIndexPage([note]);

		// Then the row shows the placeholder art for the note's slug.
		expect(html).toContain('src="/img/placeholders/peep-show.jpg"');
		// And the art explicitly links to the note with an accessible name.
		expect(html).toContain(
			'<a class="note-cover-link" href="/notes/peep-show/" aria-label="Read On Peep Show">',
		);
	});
});

describe("header notes link", () => {
	it("lists essays, projects, then notes in both menus", () => {
		// Given the site header.
		const html = header();

		// When the navigation links are read in order.
		const links = [...html.matchAll(/<a href="([^"]+)">(\w+)<\/a>/g)].map(
			(match) => match[2],
		);

		// Then each menu matches the homepage section order.
		expect(links).toEqual([
			"Essays",
			"Projects",
			"Notes",
			"Essays",
			"Projects",
			"Notes",
		]);
	});
});
