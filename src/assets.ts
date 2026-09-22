import { cp, mkdir } from "node:fs/promises";
import path from "node:path";

/** Every stylesheet the pages link. A missing one fails the build. */
const STYLES = [
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
];

/**
 * `static/` is copied as-is (js/, img/, favicon); stylesheets land
 * under css/ beside them.
 */
export async function copySiteAssets(
	sourceRoot: string,
	outDir: string,
): Promise<void> {
	await cp(path.join(sourceRoot, "static"), outDir, { recursive: true });
	const cssDir = path.join(outDir, "css");
	await mkdir(cssDir, { recursive: true });
	for (const style of STYLES) {
		await cp(path.join(sourceRoot, "styles", style), path.join(cssDir, style));
	}
}
