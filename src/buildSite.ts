import { mkdir, rm } from "node:fs/promises";
import { articleImagePlans } from "./articleImages.js";
import { copySiteAssets } from "./assets.js";
import { cardImagePlans } from "./cardImages.js";
import { loadEssays, loadNotes, loadPages, loadProjects } from "./content.js";
import { generateRenditions } from "./renditionGenerator.js";
import { generateSite } from "./routes.js";

export interface BuildResult {
	imageCount: number;
	essayCount: number;
	noteCount: number;
	projectCount: number;
	pageCount: number;
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
	const pages = await loadPages();
	await generateSite({ essays, notes, projects, pages }, outDir);
	await copySiteAssets(".", outDir);
	const pieces = [...essays, ...notes, ...projects];
	const bodies = [...pieces, ...pages].flatMap((piece) => piece.images);
	const plans = [...cardImagePlans(pieces), ...articleImagePlans(bodies)];
	const imageCount = await generateRenditions(plans, { outDir });
	return {
		imageCount,
		essayCount: essays.length,
		noteCount: notes.length,
		projectCount: projects.length,
		pageCount: pages.length,
	};
}
