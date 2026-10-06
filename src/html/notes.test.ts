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
	it("lists each note as a row with its year, reading time, and link", () => {
		// Given one note from 2020 that takes three minutes to read.
		const note = sampleNote();

		// When the notes index renders.
		const html = noteIndexPage([note]);

		// Then the page counts one note.
		expect(html).toContain('<p class="index-count">1 note</p>');
		// And the row shows the year and reading time.
		expect(html).toContain("2020 · 3 min");
		// And the title links to the note under /notes/.
		expect(html).toContain('<a href="/notes/peep-show/">On Peep Show</a>');
	});

	it("gives a coverless note its generated placeholder art", () => {
		// Given a note without a cover image.
		const note = sampleNote();

		// When the notes index renders.
		const html = noteIndexPage([note]);

		// Then the row shows the placeholder art for the note's slug.
		expect(html).toContain('src="/img/placeholders/peep-show.jpg"');
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
});

describe("homePage notes", () => {
	it("places recent notes between featured essays and featured projects", () => {
		// Given one essay, one note, and one project.
		const essay = sampleNote({
			section: "essays",
			slug: "on-mind",
			title: "On Mind",
		});

		// When the homepage renders.
		const html = homePage([essay], [sampleProject()], [sampleNote()]);

		// Then the notes section sits after the essays and before the projects.
		const essays = html.indexOf('id="featured-essays"');
		const notes = html.indexOf('id="recent-notes"');
		const projects = html.indexOf('id="featured-projects"');
		expect(essays).toBeGreaterThan(-1);
		expect(notes).toBeGreaterThan(essays);
		expect(projects).toBeGreaterThan(notes);
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
	it("links the notes index between essays and projects in both menus", () => {
		// Given the site header.
		const html = header();

		// When the navigation links are read in order.
		const links = [...html.matchAll(/<a href="([^"]+)">(\w+)<\/a>/g)].map(
			(match) => match[2],
		);

		// Then each menu lists Essays, Notes, then Projects.
		expect(links).toEqual([
			"Essays",
			"Notes",
			"Projects",
			"Essays",
			"Notes",
			"Projects",
		]);
	});
});
