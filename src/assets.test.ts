import { mkdir, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copySiteAssets } from "./assets.js";

describe("copySiteAssets", registerAssetTests);

function registerAssetTests(): void {
	registerMissingStylesheetTest();
	registerEssayStylesheetTest();
}

function registerMissingStylesheetTest(): void {
	it("fails when a required stylesheet is missing", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "blog-assets-"));
		const outDir = path.join(root, "dist");
		await mkdir(path.join(root, "static"));
		await mkdir(path.join(root, "styles"));
		await writeFile(path.join(root, "styles/main.css"), "body {}\n");
		await writeFile(path.join(root, "styles/prose.css"), ".prose {}\n");
		await writeFile(path.join(root, "styles/figures.css"), "figure {}\n");
		await writeFile(path.join(root, "styles/essay.css"), ".essay {}\n");
		await writeFile(
			path.join(root, "styles/essay-patterns.css"),
			".essay {}\n",
		);
		await writeFile(
			path.join(root, "styles/essay-discussion.css"),
			".essay {}\n",
		);
		await writeFile(path.join(root, "styles/project.css"), ".project {}\n");
		await writeFile(path.join(root, "styles/diagrams.css"), ".diagram {}\n");

		await expect(copySiteAssets(root, outDir)).rejects.toThrow(/hero\.css/);
	});
}

function registerEssayStylesheetTest(): void {
	it("copies every essay stylesheet", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "blog-assets-"));
		const outDir = path.join(root, "dist");
		await mkdir(path.join(root, "static"));
		await mkdir(path.join(root, "styles"));
		for (const style of [
			"main.css",
			"prose.css",
			"figures.css",
			"essay.css",
			"essay-patterns.css",
			"essay-discussion.css",
			"project.css",
			"diagrams.css",
			"hero.css",
			"header.css",
		]) {
			await writeFile(path.join(root, "styles", style), "body {}\n");
		}

		await copySiteAssets(root, outDir);

		expect(await readdir(path.join(outDir, "css"))).toEqual(
			expect.arrayContaining([
				"essay.css",
				"essay-patterns.css",
				"essay-discussion.css",
			]),
		);
	});
}
