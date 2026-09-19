import { cp, mkdir, rm } from "node:fs/promises";
import { loadEssays, loadProjects } from "./content.js";
import { generateSite } from "./routes.js";

const outDir = process.argv[2] ?? "dist";

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const essays = await loadEssays();
const projects = await loadProjects();
await generateSite(essays, projects, outDir);

// Copy static assets when present; ignore when absent so a fresh
// checkout without optional assets still builds.
await cp("static", outDir, { recursive: true }).catch(() => {});
await cp("styles/main.css", `${outDir}/styles.css`).catch(() => {});
await cp("styles/prose.css", `${outDir}/prose.css`).catch(() => {});
await cp("styles/hero.css", `${outDir}/hero.css`).catch(() => {});
// Required, not optional: the hero field imports this sibling module.
// A declared dependency, so a missing file fails the build loudly.
// Note: three.module.min.js is a facade that statically imports
// ./three.core.min.js, so both files must ship side by side.
await cp(
	"node_modules/three/build/three.module.min.js",
	`${outDir}/three.module.min.js`,
);
await cp(
	"node_modules/three/build/three.core.min.js",
	`${outDir}/three.core.min.js`,
);

console.log(
	`Built ${essays.length} essay(s) and ${projects.length} project(s) -> ${outDir}/`,
);
