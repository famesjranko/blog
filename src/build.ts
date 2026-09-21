import { mkdir, rm } from "node:fs/promises";
import { copySiteAssets } from "./assets.js";
import { loadEssays, loadProjects } from "./content.js";
import { generateSite } from "./routes.js";
import { showDrafts } from "./site.js";

const outDir = process.argv[2] ?? "dist";
const includeDrafts = showDrafts();

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const essays = await loadEssays(undefined, includeDrafts);
const projects = await loadProjects(undefined, includeDrafts);
await generateSite(essays, projects, outDir);

await copySiteAssets(".", outDir);

console.log(
	`Built ${essays.length} essay(s) and ${projects.length} project(s) -> ${outDir}/${includeDrafts ? " (drafts included)" : ""}`,
);
