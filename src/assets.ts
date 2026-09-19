import { cp } from "node:fs/promises";
import path from "node:path";

const STYLES = ["main.css", "prose.css", "hero.css", "header.css"];

export async function copySiteAssets(
	sourceRoot: string,
	outDir: string,
): Promise<void> {
	await cp(path.join(sourceRoot, "static"), outDir, { recursive: true });
	for (const style of STYLES) {
		await cp(
			path.join(sourceRoot, "styles", style),
			path.join(outDir, style === "main.css" ? "styles.css" : style),
		);
	}
}
