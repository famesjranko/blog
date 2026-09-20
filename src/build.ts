import { mkdir, rm } from "node:fs/promises";
import { copySiteAssets } from "./assets.js";
import { loadEssays, loadProjects } from "./content.js";
import { generateSite } from "./routes.js";

const outDir = process.argv[2] ?? "dist";

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const essays = await loadEssays();
const projects = await loadProjects();
await generateSite(essays, projects, outDir);

await copySiteAssets(".", outDir);

console.log(
	`Built ${essays.length} essay(s) and ${projects.length} project(s) -> ${outDir}/`,
);
