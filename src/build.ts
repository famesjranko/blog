import { buildSite } from "./buildSite.js";
import { showDrafts } from "./site.js";

const outDir = process.argv[2] ?? "dist";
const includeDrafts = showDrafts();

const result = await buildSite(outDir, includeDrafts);

console.log(
	`Built ${result.essayCount} essay(s), ${result.projectCount} project(s), and ${result.cardImageCount} card image(s) -> ${outDir}/${includeDrafts ? " (drafts included)" : ""}`,
);
