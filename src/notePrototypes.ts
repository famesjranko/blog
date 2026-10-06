import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Essay } from "./content.js";
import {
	notePrototypeIndex,
	notePrototypePage,
	optionsForNote,
} from "./html/notePrototype.js";

async function write(outDir: string, rel: string, body: string): Promise<void> {
	const full = path.join(outDir, rel);
	await mkdir(path.dirname(full), { recursive: true });
	await writeFile(full, body, "utf8");
}

/** Build review-only pages when SHOW_DRAFTS is enabled. */
export async function generateNotePrototypes(
	notes: Essay[],
	outDir: string,
): Promise<void> {
	const root = path.join(outDir, "prototypes/notes");
	await mkdir(root, { recursive: true });
	await copyFile("styles/note-prototypes.css", path.join(root, "styles.css"));
	await write(outDir, "prototypes/notes/index.html", notePrototypeIndex(notes));
	for (const note of notes) {
		for (const option of optionsForNote(note)) {
			await write(
				outDir,
				`prototypes/notes/${note.slug}/${option.id}/index.html`,
				notePrototypePage(note, option),
			);
		}
	}
}
