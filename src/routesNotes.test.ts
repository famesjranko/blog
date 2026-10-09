import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Essay, Page } from "./content.js";
import { generateSite } from "./routes.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Mind",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["Philosophy of Mind"],
		philosophers: [],
		featured: false,
		draft: false,
		section: "essays",
		slug: "on-mind",
		html: "<p>Body.</p>",
		readingMinutes: 1,
		images: [],
		sourcePath: "content/essays/on-mind.md",
		...overrides,
	};
}

function sampleNote(overrides: Partial<Essay> = {}): Essay {
	return sampleEssay({
		title: "On Peep Show",
		section: "notes",
		slug: "peep-show",
		sourcePath: "content/notes/peep-show.md",
		...overrides,
	});
}

/** The page the header links to; the build refuses a site without it. */
const navPage: Page = {
	title: "Agentic engineering",
	slug: "agentic-engineering",
	html: "<p>Body.</p>",
	images: [],
	sourcePath: "content/pages/agentic-engineering.md",
};

async function generate(essays: Essay[], notes: Essay[]): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "blog-notes-"));
	await generateSite({ essays, notes, projects: [], pages: [navPage] }, dir);
	return dir;
}

describe("generateSite notes", registerNoteRouteTests);

function registerNoteRouteTests(): void {
	registerNotePageTest();
	registerNoteIndexTest();
	registerSharedTopicTest();
	registerFeedAndSitemapTest();
	registerDuplicateSlugTest();
}

function registerNotePageTest(): void {
	it("writes a note page under /notes/ and not under /essays/", async () => {
		// Given one note and no essays.
		const notes = [sampleNote()];

		// When the site is generated.
		const dir = await generate([], notes);

		// Then the note page exists under /notes/.
		const html = await readFile(
			path.join(dir, "notes/peep-show/index.html"),
			"utf8",
		);
		expect(html).toContain("On Peep Show");
		// And no copy exists under /essays/.
		await expect(stat(path.join(dir, "essays/peep-show"))).rejects.toThrow();
	});
}

function registerNoteIndexTest(): void {
	it("lists notes on the notes index and keeps them off the essays index", async () => {
		// Given one essay and one note.
		const essays = [sampleEssay()];
		const notes = [sampleNote()];

		// When the site is generated.
		const dir = await generate(essays, notes);

		// Then the notes index links the note.
		const notesIndex = await readFile(
			path.join(dir, "notes/index.html"),
			"utf8",
		);
		expect(notesIndex).toContain('href="/notes/peep-show/"');
		// And the essays index does not mention it.
		const essaysIndex = await readFile(
			path.join(dir, "essays/index.html"),
			"utf8",
		);
		expect(essaysIndex).not.toContain("On Peep Show");
	});
}

function registerSharedTopicTest(): void {
	it("links a note from a shared topic page at its /notes/ URL", async () => {
		// Given an essay and a note that share a topic.
		const essays = [sampleEssay()];
		const notes = [sampleNote()];

		// When the site is generated.
		const dir = await generate(essays, notes);

		// Then the topic page links the note under /notes/.
		const topic = await readFile(
			path.join(dir, "topics/philosophy-of-mind/index.html"),
			"utf8",
		);
		expect(topic).toContain('href="/notes/peep-show/"');
		// And it still links the essay under /essays/.
		expect(topic).toContain('href="/essays/on-mind/"');
	});
}

function registerFeedAndSitemapTest(): void {
	it("puts published notes in the feed and sitemap, and keeps drafts out", async () => {
		// Given one published note and one draft note.
		const notes = [
			sampleNote(),
			sampleNote({ slug: "draft-note", title: "Draft note", draft: true }),
		];

		// When the site is generated.
		const dir = await generate([], notes);

		// Then the sitemap lists the notes index and the published note.
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(sitemap).toContain("/notes/</loc>");
		expect(sitemap).toContain("/notes/peep-show/</loc>");
		// And the feed links the published note.
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(rss).toContain("/notes/peep-show/</link>");
		// And neither surface mentions the draft.
		expect(sitemap).not.toContain("draft-note");
		expect(rss).not.toContain("draft-note");
	});
}

function registerDuplicateSlugTest(): void {
	it("rejects duplicate note slugs and names both sources", async () => {
		// Given two notes that share a slug.
		const notes = [
			sampleNote({ sourcePath: "content/notes/a.md" }),
			sampleNote({ sourcePath: "content/notes/b.md" }),
		];

		// When the site is generated.
		const result = generate([], notes);

		// Then the build fails and names both files.
		await expect(result).rejects.toThrow(/notes.*a\.md.*b\.md/);
	});
}
