import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Essay } from "./content.js";
import { generateSite } from "./routes.js";

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Mind",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["Philosophy of Mind"],
		philosophers: [],
		draft: false,
		slug: "on-mind",
		html: "<p>Body.</p>",
		sourcePath: "content/essays/on-mind.md",
		...overrides,
	};
}

async function generate(essays: Essay[]): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "blog-routes-"));
	await generateSite(essays, dir);
	return dir;
}

describe("generateSite topics", () => {
	it("writes topic pages at slugified paths", async () => {
		const dir = await generate([sampleEssay()]);
		const html = await readFile(
			path.join(dir, "topics/philosophy-of-mind/index.html"),
			"utf8",
		);
		expect(html).toContain("On Mind");
	});

	it("never writes raw topic names with spaces", async () => {
		const dir = await generate([sampleEssay()]);
		await expect(
			stat(path.join(dir, "topics/Philosophy of Mind")),
		).rejects.toThrow();
	});

	it("lists topic URLs in the sitemap", async () => {
		const dir = await generate([sampleEssay()]);
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(sitemap).toContain("topics/philosophy-of-mind/");
	});

	it("links essay entries to slugified topic pages", async () => {
		const dir = await generate([sampleEssay()]);
		const index = await readFile(path.join(dir, "essays/index.html"), "utf8");
		expect(index).toContain("/topics/philosophy-of-mind/");
	});
});
