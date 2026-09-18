import { cp, mkdir, rm } from "node:fs/promises";
import { loadEssays } from "./content.js";
import { generateSite } from "./routes.js";

const outDir = process.argv[2] ?? "dist";

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const essays = await loadEssays();
await generateSite(essays, outDir);

// Copy static assets when present; ignore when absent so a fresh
// checkout without optional assets still builds.
await cp("static", outDir, { recursive: true }).catch(() => {});
await cp("styles/main.css", `${outDir}/styles.css`).catch(() => {});

console.log(`Built ${essays.length} essay(s) -> ${outDir}/`);
