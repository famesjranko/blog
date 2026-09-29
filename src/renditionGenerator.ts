import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { RenditionCandidate, RenditionPlan } from "./renditions.js";

interface GenerateOptions {
	sourceRoot?: string;
	outDir?: string;
}

function diskPath(root: string, sitePath: string): string {
	return path.join(root, sitePath.replace(/^\/+/, ""));
}

async function encodeCandidate(
	sourceFile: string,
	candidate: RenditionCandidate,
	outDir: string,
): Promise<void> {
	const avifFile = diskPath(outDir, candidate.avifSrc);
	const webpFile = diskPath(outDir, candidate.webpSrc);
	await mkdir(path.dirname(avifFile), { recursive: true });
	const resized = sharp(sourceFile).rotate().resize({
		width: candidate.width,
		height: candidate.height,
		fit: "cover",
		position: "centre",
	});
	await Promise.all([
		resized
			.clone()
			.avif({ quality: 50, effort: 4, chromaSubsampling: "4:2:0" })
			.toFile(avifFile),
		resized.clone().webp({ quality: 80, effort: 6 }).toFile(webpFile),
	]);
}

async function encodePlan(
	plan: RenditionPlan,
	sourceRoot: string,
	outDir: string,
): Promise<number> {
	const sourceFile = diskPath(sourceRoot, plan.source);
	for (const candidate of plan.candidates) {
		await encodeCandidate(sourceFile, candidate, outDir);
	}
	return plan.candidates.length * 2;
}

/**
 * Encode every candidate of the given plans. Callers pass only the plans
 * their markup references, so no unused rendition is written.
 */
export async function generateRenditions(
	plans: readonly RenditionPlan[],
	options: GenerateOptions = {},
): Promise<number> {
	const sourceRoot = options.sourceRoot ?? "static";
	const outDir = options.outDir ?? "dist";
	const counts = await Promise.all(
		plans.map((plan) => encodePlan(plan, sourceRoot, outDir)),
	);
	return counts.reduce((total, count) => total + count, 0);
}
