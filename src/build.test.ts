import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function buildToTemp(): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), "blog-dist-"));
	const outDir = path.join(root, "dist");
	// Always the production shape, whatever the developer's shell exports.
	const { SHOW_DRAFTS: _, ...env } = process.env;
	execFileSync("npx", ["tsx", "src/build.ts", outDir], { stdio: "pipe", env });
	return outDir;
}

describe("build output", () => {
	it("ships no three.js bundle and no module that imports one", async () => {
		const outDir = await buildToTemp();
		const files = await readdir(path.join(outDir, "js"));
		expect(files.filter((name) => name.startsWith("three"))).toEqual([]);
		for (const name of files.filter((file) => file.endsWith(".js"))) {
			const text = await readFile(path.join(outDir, "js", name), "utf8");
			expect(text, name).not.toMatch(/["']\.\/three/);
		}
	}, 30000);

	it("keeps scripts under js/ and stylesheets under css/, none at the root", async () => {
		const outDir = await buildToTemp();
		const root = await readdir(outDir);
		expect(root.filter((name) => /\.(js|css)$/.test(name))).toEqual([]);
		const scripts = await readdir(path.join(outDir, "js"));
		expect(scripts).toContain("hero.js");
		expect(scripts).toContain("theme.js");
		const styles = await readdir(path.join(outDir, "css"));
		expect(styles).toEqual(
			expect.arrayContaining([
				"main.css",
				"header.css",
				"prose.css",
				"figures.css",
				"essay.css",
				"essay-patterns.css",
				"essay-discussion.css",
				"project.css",
				"diagrams.css",
				"hero.css",
			]),
		);
	}, 30000);
});
