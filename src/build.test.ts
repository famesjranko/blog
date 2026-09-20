import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function buildToTemp(): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), "blog-dist-"));
	const outDir = path.join(root, "dist");
	execFileSync("npx", ["tsx", "src/build.ts", outDir], { stdio: "pipe" });
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

	it("keeps every script under js/ and none at the site root", async () => {
		const outDir = await buildToTemp();
		const root = await readdir(outDir);
		expect(root.filter((name) => name.endsWith(".js"))).toEqual([]);
		const scripts = await readdir(path.join(outDir, "js"));
		expect(scripts).toContain("hero.js");
		expect(scripts).toContain("theme.js");
	}, 30000);
});
