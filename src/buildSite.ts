import { mkdir, rm } from "node:fs/promises";
import { copySiteAssets } from "./assets.js";
import { articleImagePlans } from "./articleImages.js";
import { cardImagePlans } from "./cardImages.js";
import { loadEssays, loadNotes, loadProjects } from "./content.js";
import { generateRenditions } from "./renditionGenerator.js";
import { generateSite } from "./routes.js";

export interface BuildResult {
	imageCount: number;
	essayCount: number;
	noteCount: number;
	projectCount: number;
}

export async function buildSite(
	outDir: string,
	includeDrafts: boolean,
): Promise<BuildResult> {
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });

	const essays = await loadEssays(undefined, includeDrafts);
	const notes = await loadNotes(includeDrafts);
	const projects = await loadProjects(undefined, includeDrafts);
	await generateSite({ essays, notes, projects }, outDir);
	await copySiteAssets(".", outDir);
	const pieces = [...essays, ...notes, ...projects];
	const plans = [
		...cardImagePlans(pieces),
		...articleImagePlans(pieces.flatMap((piece) => piece.images)),
	];
	const imageCount = await generateRenditions(plans, { outDir });
	return {
		imageCount,
		essayCount: essays.length,
		noteCount: notes.length,
		projectCount: projects.length,
	};
}
