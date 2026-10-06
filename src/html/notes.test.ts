import { describe, expect, it } from "vitest";
import type { Essay, Project } from "../content.js";
import { homePage } from "./index.js";
import { header } from "./layout.js";
import {
	RECENT_NOTES_COUNT,
	noteIndexPage,
	recentNotesSection,
} from "./notes.js";

function sampleNote(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Peep Show",
		description: "The first-person camera as phenomenology.",
		date: new Date("2020-07-12T00:00:00Z"),
		topics: ["sartre"],
		philosophers: [],
		featured: false,
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

function sampleProject(): Project {
	return {
		title: "Tablescan",
		description: "A PDF table front end.",
		date: new Date("2026-03-15T00:00:00Z"),
		origin: "personal",
		stack: ["python"],
		featured: false,
		draft: false,
		slug: "tablescan",
		html: "<p>Body.</p>",
		readingMinutes: 1,
		images: [],
		sourcePath: "content/projects/tablescan.md",
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

describe("recentNotesSection", () => {
	it("renders nothing when there are no notes", () => {
		// Given no notes.
		const notes: Essay[] = [];

		// When the homepage section renders.
		const html = recentNotesSection(notes);

		// Then there is no section.
		expect(html).toBe("");
	});

	it("shows only the newest notes, newest first", () => {
		// Given one more note than the section holds, oldest first.
		const notes = Array.from({ length: RECENT_NOTES_COUNT + 1 }, (_, i) =>
			sampleNote({
				title: `Note ${i}`,
				slug: `note-${i}`,
				date: new Date(Date.UTC(2010 + i, 0, 1)),
			}),
		);

		// When the homepage section renders.
		const html = recentNotesSection(notes);

		// Then the oldest note is left out.
		expect(html).not.toContain("Note 0<");
		// And the newest note comes before the next newest.
		const newest = html.indexOf(`Note ${RECENT_NOTES_COUNT}<`);
		const next = html.indexOf(`Note ${RECENT_NOTES_COUNT - 1}<`);
		expect(newest).toBeGreaterThan(-1);
		expect(newest).toBeLessThan(next);
	});

	it("leaves article metadata off the homepage note blocks", () => {
		// Given one note with a date and reading time.
		const note = sampleNote();

		// When the homepage notes section renders.
		const html = recentNotesSection([note]);

		// Then its title and description remain without article metadata.
		expect(html).toContain("On Peep Show");
		expect(html).toContain("The first-person camera as phenomenology.");
		expect(html).not.toContain("2020 · 3 min");
		expect(html).not.toContain("note-meta");
	});
});

describe("homePage notes", () => {
	it("places recent notes after featured essays and featured projects", () => {
		// Given one essay, one note, and one project.
		const essay = sampleNote({
			section: "essays",
			slug: "on-mind",
			title: "On Mind",
		});

		// When the homepage renders.
		const html = homePage([essay], [sampleProject()], [sampleNote()]);

		// Then the primary essay and project sections both precede the notes.
		const essays = html.indexOf('id="featured-essays"');
		const notes = html.indexOf('id="recent-notes"');
		const projects = html.indexOf('id="featured-projects"');
		expect(essays).toBeGreaterThan(-1);
		expect(projects).toBeGreaterThan(essays);
		expect(notes).toBeGreaterThan(projects);
	});

	it("skips to the notes when there are no essays", () => {
		// Given notes but no essays.
		const notes = [sampleNote()];

		// When the homepage renders.
		const html = homePage([], [], notes);

		// Then the skip link targets the notes section.
		expect(html).toContain('<a class="skip-link" href="#recent-notes">');
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
