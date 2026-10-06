import { describe, expect, it } from "vitest";
import { loadNotes } from "../content.js";
import {
	notePrototypeIndex,
	notePrototypePage,
	optionsForNote,
} from "./notePrototype.js";

function bodyText(html: string): string {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function articleBody(html: string): string {
	return (
		html.match(/<article[^>]*>[\s\S]*?<\/header>([\s\S]*?)<\/article>/)?.[1] ??
		""
	);
}

describe("note formatting prototypes", () => {
	it("preserves every note's prose in every option", async () => {
		// Given the real notes and their rendered prose.
		const notes = await loadNotes(true);

		// When every formatting option is rendered.
		const comparisons = notes.flatMap((note) =>
			optionsForNote(note).map((option) => ({
				actual: bodyText(articleBody(notePrototypePage(note, option))),
				expected: bodyText(note.html),
			})),
		);

		// Then formatting does not add, remove, or reorder prose.
		for (const comparison of comparisons) {
			expect(comparison.actual).toBe(comparison.expected);
		}
	});

	it("links to the baseline and the focused Emperor options", async () => {
		// Given all notes and their available prototype options.
		const notes = await loadNotes(true);

		// When the prototype index is rendered.
		const html = notePrototypeIndex(notes);
		const links =
			html.match(
				/href="\/prototypes\/notes\/[^"]+\/(restrained|book|folio|inset)\/"/g,
			) ?? [];

		// Then every note has a baseline and Emperor has three opening options.
		expect(links).toHaveLength(notes.length + 3);
	});
});
