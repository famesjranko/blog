import { mkdir, rm } from "node:fs/promises";
import { copySiteAssets } from "./assets.js";
import { generateCardImages } from "./cardImageGenerator.js";
import { loadEssays, loadProjects } from "./content.js";
import { generateSite } from "./routes.js";

export interface BuildResult {
	cardImageCount: number;
	essayCount: number;
	projectCount: number;
}

export async function buildSite(
	outDir: string,
	includeDrafts: boolean,
): Promise<BuildResult> {
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });

	const essays = await loadEssays(undefined, includeDrafts);
	const projects = await loadProjects(undefined, includeDrafts);
	await generateSite(essays, projects, outDir);
	await copySiteAssets(".", outDir);
	const cardImageCount = await generateCardImages([...essays, ...projects], {
		outDir,
	});
	return {
		cardImageCount,
		essayCount: essays.length,
		projectCount: projects.length,
	};
}
