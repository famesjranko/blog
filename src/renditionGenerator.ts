import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import type { RenditionCandidate, RenditionPlan } from "./renditions.js";

interface GenerateOptions {
	sourceRoot?: string;
	outDir?: string;
	/** Holds encodings from earlier builds; safe to delete at any time. */
	cacheDir?: string;
}

const ENCODERS = {
	avif: { quality: 50, effort: 4, chromaSubsampling: "4:2:0" },
	webp: { quality: 80, effort: 6 },
} as const;

type Format = keyof typeof ENCODERS;

interface SourceImage {
	bytes: Buffer;
	hash: string;
}

interface EncodeJob {
	image: Sharp;
	format: Format;
	cachedFile: string;
	target: string;
}

function diskPath(root: string, sitePath: string): string {
	return path.join(root, sitePath.replace(/^\/+/, ""));
}

async function readSource(file: string): Promise<SourceImage> {
	const bytes = await readFile(file);
	return { bytes, hash: createHash("sha256").update(bytes).digest("hex") };
}

/**
 * Names an encoding by every input that shapes its bytes, so a changed
 * source, size, setting, or encoder version misses instead of reusing a
 * stale file.
 */
function cacheKey(
	source: SourceImage,
	candidate: RenditionCandidate,
	format: Format,
): string {
	const inputs = {
		source: source.hash,
		width: candidate.width,
		height: candidate.height,
		format,
		options: ENCODERS[format],
		versions: sharp.versions,
	};
	return createHash("sha256").update(JSON.stringify(inputs)).digest("hex");
}

function encode(image: Sharp, format: Format, file: string) {
	return format === "avif"
		? image.avif(ENCODERS.avif).toFile(file)
		: image.webp(ENCODERS.webp).toFile(file);
}

async function copyIfPresent(from: string, to: string): Promise<boolean> {
	try {
		await copyFile(from, to);
		return true;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return false;
		}
		throw error;
	}
}

async function encodeIntoCache(job: EncodeJob): Promise<void> {
	// Encode beside the entry and rename it into place: the rename is atomic,
	// so an interrupted build never leaves a truncated entry a later build trusts.
	const temporary = `${job.cachedFile}.${randomUUID()}.tmp`;
	try {
		await encode(job.image, job.format, temporary);
		await rename(temporary, job.cachedFile);
	} finally {
		await rm(temporary, { force: true });
	}
}

async function writeRendition(job: EncodeJob): Promise<void> {
	if (await copyIfPresent(job.cachedFile, job.target)) {
		return;
	}
	await encodeIntoCache(job);
	await copyFile(job.cachedFile, job.target);
}

async function writeCandidate(
	source: SourceImage,
	candidate: RenditionCandidate,
	dirs: Required<Pick<GenerateOptions, "outDir" | "cacheDir">>,
): Promise<void> {
	const image = sharp(source.bytes).rotate().resize({
		width: candidate.width,
		height: candidate.height,
		fit: "cover",
		position: "centre",
	});
	const targets = {
		avif: diskPath(dirs.outDir, candidate.avifSrc),
		webp: diskPath(dirs.outDir, candidate.webpSrc),
	};
	await mkdir(path.dirname(targets.avif), { recursive: true });
	await Promise.all(
		(["avif", "webp"] as const).map((format) =>
			writeRendition({
				image: image.clone(),
				format,
				cachedFile: path.join(
					dirs.cacheDir,
					`${cacheKey(source, candidate, format)}.${format}`,
				),
				target: targets[format],
			}),
		),
	);
}

async function writePlan(
	plan: RenditionPlan,
	options: Required<GenerateOptions>,
): Promise<number> {
	const source = await readSource(diskPath(options.sourceRoot, plan.source));
	for (const candidate of plan.candidates) {
		await writeCandidate(source, candidate, options);
	}
	return plan.candidates.length * 2;
}

/**
 * Encode every candidate of the given plans, reusing cached encodings.
 * Callers pass only the plans their markup references, so no unused
 * rendition is written.
 */
export async function generateRenditions(
	plans: readonly RenditionPlan[],
	options: GenerateOptions = {},
): Promise<number> {
	const resolved = {
		sourceRoot: options.sourceRoot ?? "static",
		outDir: options.outDir ?? "dist",
		cacheDir: options.cacheDir ?? ".cache/renditions",
	};
	await mkdir(resolved.cacheDir, { recursive: true });
	const counts = await Promise.all(
		plans.map((plan) => writePlan(plan, resolved)),
	);
	return counts.reduce((total, count) => total + count, 0);
}
