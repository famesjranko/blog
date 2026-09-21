import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copySiteAssets } from "./assets.js";

describe("copySiteAssets", () => {
	it("fails when a required stylesheet is missing", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "blog-assets-"));
		const outDir = path.join(root, "dist");
		await mkdir(path.join(root, "static"));
		await mkdir(path.join(root, "styles"));
		await writeFile(path.join(root, "styles/main.css"), "body {}\n");
		await writeFile(path.join(root, "styles/prose.css"), ".prose {}\n");
		await writeFile(path.join(root, "styles/diagrams.css"), ".diagram {}\n");

		await expect(copySiteAssets(root, outDir)).rejects.toThrow(/hero\.css/);
	});
});
