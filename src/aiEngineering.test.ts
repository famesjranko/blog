import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { type Essay, loadEssays } from "./content.js";
import { generateSite } from "./routes.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
	vi.unstubAllEnvs();
	for (const dir of temporaryDirectories) {
		await rm(dir, { recursive: true, force: true });
	}
	temporaryDirectories.length = 0;
});

async function temporaryDirectory(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "ai-engineering-"));
	temporaryDirectories.push(dir);
	return dir;
}

async function fixture(draft = false): Promise<Essay[]> {
	const dir = await temporaryDirectory();
	await writeFile(
		path.join(dir, "workbench.md"),
		`---\ntitle: Workbench\ndate: 2026-10-10\ndraft: ${draft}\ntopics: [infrastructure]\n---\n\nA local workbench.\n`,
	);
	return loadEssays(`${dir}/*.md`, true, "ai-engineering");
}

async function generate(aiEngineering: Essay[]): Promise<string> {
	const dir = await temporaryDirectory();
	await generateSite(
		{ essays: [], projects: [], notes: [], aiEngineering },
		dir,
	);
	return dir;
}

function read(dir: string, file: string): Promise<string> {
	return readFile(path.join(dir, file), "utf8");
}

it("makes a published AI article discoverable under its own section and deployment base", async () => {
	// Given an AI article and a deployment beneath a path prefix.
	const articles = await fixture();
	vi.stubEnv("BASE_PATH", "/blog");
	vi.stubEnv("SITE_ORIGIN", "https://example.com");

	// When the site is generated.
	const dir = await generate(articles);
	const article = await read(dir, "ai-engineering/workbench/index.html");
	const index = await read(dir, "ai-engineering/index.html");
	const home = await read(dir, "index.html");

	// Then navigation and discovery pages lead to the correctly labelled article.
	expect(article).toContain(
		'href="https://andrewjmcdonald.com/ai-engineering/workbench/"',
	);
	expect(article).toContain('<p class="article-meta">AI Engineering <span');
	expect(index).toContain("1 article");
	for (const html of [
		index,
		home,
		await read(dir, "topics/infrastructure/index.html"),
	]) {
		expect(html).toContain('href="/blog/ai-engineering/workbench/"');
	}
	expect(home).toContain('href="#featured-ai-engineering"');
	expect(
		home.match(/href="\/blog\/ai-engineering\/">AI Engineering<\/a>/g),
	).toHaveLength(2);

	// And the article is in the feed and sitemap, but not the essays index.
	expect(await read(dir, "rss.xml")).toContain(
		"https://example.com/blog/ai-engineering/workbench/",
	);
	expect(await read(dir, "sitemap.xml")).toContain(
		"https://example.com/blog/ai-engineering/workbench/",
	);
	expect(await read(dir, "essays/index.html")).not.toContain("Workbench");
});

it("keeps an AI draft out of published content while allowing preview discovery", async () => {
	// Given an AI draft stored in a content directory.
	const [draft] = await fixture(true);
	if (draft === undefined) {
		throw new Error("Missing draft fixture");
	}
	const pattern = path.join(path.dirname(draft.sourcePath), "*.md");

	// When published content and preview content are loaded separately.
	const published = await loadEssays(pattern, false, "ai-engineering");
	const preview = await loadEssays(pattern, true, "ai-engineering");
	const dir = await generate(preview);

	// Then publishing excludes the draft and preview keeps its badge and link.
	expect(published).toEqual([]);
	expect(preview).toHaveLength(1);
	expect(await read(dir, "ai-engineering/index.html")).toContain(
		'href="/ai-engineering/workbench/"',
	);
	expect(await read(dir, "ai-engineering/workbench/index.html")).toContain(
		'class="draft-eyebrow">Draft',
	);

	// And preview drafts still stay out of the feed and sitemap.
	expect(await read(dir, "rss.xml")).not.toContain("workbench/");
	expect(await read(dir, "sitemap.xml")).not.toContain("workbench/");
	expect(await read(dir, "sitemap.xml")).not.toContain(
		"topics/infrastructure/",
	);
});

it("gives the empty AI section an index without an empty homepage section", async () => {
	// Given no published AI articles.
	const articles: Essay[] = [];

	// When the site is generated.
	const dir = await generate(articles);

	// Then the index explains its state and the homepage omits its card section.
	expect(await read(dir, "ai-engineering/index.html")).toContain(
		"Articles are in progress.",
	);
	expect(await read(dir, "index.html")).not.toContain(
		'id="featured-ai-engineering"',
	);
});

it("rejects duplicate AI article slugs before overwriting a page", async () => {
	// Given two AI articles with the same slug from different sources.
	const articles = await fixture();
	const duplicates = [
		...articles,
		...articles.map((article) => ({ ...article, sourcePath: "other.md" })),
	];

	// When the site is generated.
	const result = generate(duplicates);

	// Then the collision is reported with both sources.
	await expect(result).rejects.toThrow(/workbench\.md.*other\.md.*share slug/);
});
