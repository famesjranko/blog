import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	loadEssay,
	loadEssays,
	loadPage,
	loadProject,
	loadProjects,
	pickFeatured,
} from "./content.js";

async function writeEssayFixture(dir: string, name: string, draft: boolean) {
	await writeFile(
		path.join(dir, name),
		`---\ntitle: "${name}"\ndate: 2024-01-01\ndraft: ${draft}\n---\n\nBody.\n`,
	);
}

async function writeProjectFixture(dir: string, name: string, draft: boolean) {
	await writeFile(
		path.join(dir, name),
		`---\ntitle: "${name}"\ndate: 2024-01-01\ndraft: ${draft}\norigin: personal\n---\n\nBody.\n`,
	);
}

function item(slug: string, date: string, featured: boolean) {
	return { slug, date: new Date(date), featured };
}

function slugs(
	items: { slug: string; date: Date; featured: boolean }[],
	count?: number,
): string[] {
	return pickFeatured(items, count).map((i) => i.slug);
}

describe("pickFeatured flagged items", () => {
	it("puts a flagged item first and backfills with the newest", () => {
		const items = [
			item("new", "2021-06-01", false),
			item("middle", "2020-06-01", false),
			item("pick", "2020-01-01", true),
		];
		expect(slugs(items)).toEqual(["pick", "new"]);
	});

	it("orders several flagged items newest-first", () => {
		const items = [
			item("older-pick", "2020-01-01", true),
			item("newer-pick", "2020-06-01", true),
			item("newest", "2021-06-01", false),
		];
		expect(slugs(items)).toEqual(["newer-pick", "older-pick"]);
	});

	it("caps the row at the requested count", () => {
		const items = [
			item("a", "2020-01-01", true),
			item("b", "2020-02-01", true),
			item("c", "2020-03-01", true),
		];
		expect(slugs(items, 2)).toEqual(["c", "b"]);
		expect(slugs(items, 1)).toEqual(["c"]);
	});

	it("never repeats an item", () => {
		const items = [item("only", "2020-01-01", true)];
		expect(slugs(items)).toEqual(["only"]);
	});
});

describe("pickFeatured fallback", () => {
	it("returns an empty row when there is nothing to pick from", () => {
		expect(pickFeatured([])).toEqual([]);
	});

	it("falls back to the newest items when nothing is flagged", () => {
		const items = [
			item("old", "2020-01-01", false),
			item("new", "2021-06-01", false),
			item("middle", "2020-06-01", false),
		];
		expect(slugs(items)).toEqual(["new", "middle"]);
	});

	it("ignores input order", () => {
		const items = [
			item("newest", "2021-06-01", false),
			item("oldest", "2019-01-01", false),
			item("middle", "2020-01-01", false),
		];
		expect(slugs(items)).toEqual(["newest", "middle"]);
	});
});

describe("loadEssays draft filtering", () => {
	it("excludes front matter from the reading estimate", async () => {
		// Given an essay with 201 words in front matter and one body word.
		const dir = await mkdtemp(path.join(tmpdir(), "essay-time-"));
		const file = path.join(dir, "frontmatter.md");
		const metadata = Array(201).fill("metadata").join(" ");
		await writeFile(
			file,
			`---\ntitle: Essay\ndate: 2024-01-01\ndescription: ${metadata}\n---\n\nBody.`,
		);

		// When the essay is loaded.
		const essay = await loadEssay(file);

		// Then only the body contributes to its reading estimate.
		expect(essay.readingMinutes).toBe(1);
	});

	it("excludes drafts by default", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "essays-"));
		await writeEssayFixture(dir, "published.md", false);
		await writeEssayFixture(dir, "in-progress.md", true);
		const essays = await loadEssays(`${dir}/*.md`);
		expect(essays.map((e) => e.slug)).toEqual(["published"]);
	});

	it("includes drafts when includeDrafts is true", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "essays-"));
		await writeEssayFixture(dir, "published.md", false);
		await writeEssayFixture(dir, "in-progress.md", true);
		const essays = await loadEssays(`${dir}/*.md`, true);
		expect(essays.map((e) => e.slug).sort()).toEqual([
			"in-progress",
			"published",
		]);
	});
});

describe("loadProjects draft filtering", () => {
	it("excludes front matter from the reading estimate", async () => {
		// Given a project with 201 description words and one body word.
		const dir = await mkdtemp(path.join(tmpdir(), "project-time-"));
		const file = path.join(dir, "frontmatter.md");
		const metadata = Array(201).fill("metadata").join(" ");
		await writeFile(
			file,
			`---\ntitle: Project\ndate: 2024-01-01\norigin: personal\ndescription: ${metadata}\n---\n\nBody.`,
		);

		// When the project is loaded.
		const project = await loadProject(file);

		// Then only the body contributes to its reading estimate.
		expect(project.readingMinutes).toBe(1);
	});

	it("excludes drafts by default", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "projects-"));
		await writeProjectFixture(dir, "published.md", false);
		await writeProjectFixture(dir, "in-progress.md", true);
		const projects = await loadProjects(`${dir}/*.md`);
		expect(projects.map((p) => p.slug)).toEqual(["published"]);
	});

	it("includes drafts when includeDrafts is true", async () => {
		const dir = await mkdtemp(path.join(tmpdir(), "projects-"));
		await writeProjectFixture(dir, "published.md", false);
		await writeProjectFixture(dir, "in-progress.md", true);
		const projects = await loadProjects(`${dir}/*.md`, true);
		expect(projects.map((p) => p.slug).sort()).toEqual([
			"in-progress",
			"published",
		]);
	});
});

describe("loadPage", () => {
	it("renders a page with its eyebrow and a slug from the file name", async () => {
		// Given a page file with a title, an eyebrow, and a body image.
		const dir = await mkdtemp(path.join(tmpdir(), "blog-pages-"));
		const file = path.join(dir, "agentic-engineering.md");
		await writeFile(
			file,
			'---\ntitle: "Agentic engineering"\neyebrow: "Four pieces"\n---\n\nBody with ![a diagram](/img/agentic/team.svg).\n',
		);

		// When the page is loaded.
		const page = await loadPage(file);

		// Then its metadata, slug, rendered body and image sources are present.
		expect(page.title).toBe("Agentic engineering");
		expect(page.eyebrow).toBe("Four pieces");
		expect(page.slug).toBe("agentic-engineering");
		expect(page.html).toContain("<p>Body with");
		expect(page.images).toEqual(["/img/agentic/team.svg"]);
	});

	it("rejects a page whose frontmatter has an unknown key", async () => {
		// Given a page file with a misspelt field.
		const dir = await mkdtemp(path.join(tmpdir(), "blog-pages-"));
		const file = path.join(dir, "page.md");
		await writeFile(
			file,
			'---\ntitle: "Page"\neyebrows: "typo"\n---\n\nBody.\n',
		);

		// When the page is loaded.
		const load = loadPage(file);

		// Then loading fails rather than silently dropping the field.
		await expect(load).rejects.toThrow();
	});
});
