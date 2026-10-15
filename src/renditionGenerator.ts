import { createHash, randomUUID } from "node:crypto";
import {
	access,
	copyFile,
	mkdir,
	readFile,
	rename,
	rm,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
}

interface BuildContext {
	sourceRoot: string;
	outDir: string;
	cacheDir: string;
	/** Hash of this module's source, which defines the whole pipeline. */
	pipeline: string;
	ensureCached: (job: EncodeJob) => Promise<void>;
}

function diskPath(root: string, sitePath: string): string {
	return path.join(root, sitePath.replace(/^\/+/, ""));
}

function sha256(data: string | Buffer): string {
	return createHash("sha256").update(data).digest("hex");
}

async function readSource(file: string): Promise<SourceImage> {
	const bytes = await readFile(file);
	return { bytes, hash: sha256(bytes) };
}

/**
 * Names an encoding by every input that shapes its bytes. The pipeline
 * enters as a hash of this file rather than a list of its steps, so an
 * edit to any step, even one a list would forget, re-encodes everything
 * instead of reusing a stale file.
 */
function cacheKey(
	context: BuildContext,
	source: SourceImage,
	candidate: RenditionCandidate,
	format: Format,
): string {
	const inputs = {
		pipeline: context.pipeline,
		source: source.hash,
		width: candidate.width,
		height: candidate.height,
		format,
		versions: sharp.versions,
	};
	return sha256(JSON.stringify(inputs));
}

function encode(image: Sharp, format: Format, file: string) {
	return format === "avif"
		? image.avif(ENCODERS.avif).toFile(file)
		: image.webp(ENCODERS.webp).toFile(file);
}

async function isCached(file: string): Promise<boolean> {
	try {
		await access(file);
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
	} catch (error) {
		// Nothing reads a leftover temporary file, so a failed cleanup must
		// not replace the error that explains the failed encode.
		await rm(temporary, { force: true }).catch(() => undefined);
		throw error;
	}
}

/**
 * Card and body renditions of a 16:9 source share entries. One build
 * encodes each entry once; later requests wait for that encode, so no two
 * writers race to rename the same entry.
 */
function cacheFiller(): (job: EncodeJob) => Promise<void> {
	const pending = new Map<string, Promise<void>>();
	return (job) => {
		const existing = pending.get(job.cachedFile);
		if (existing !== undefined) {
			return existing;
		}
		const filling = isCached(job.cachedFile).then((cached) =>
			cached ? undefined : encodeIntoCache(job),
		);
		pending.set(job.cachedFile, filling);
		return filling;
	};
}

async function writeCandidate(
	context: BuildContext,
	source: SourceImage,
	candidate: RenditionCandidate,
): Promise<void> {
	const image = sharp(source.bytes).rotate().resize({
		width: candidate.width,
		height: candidate.height,
		fit: "cover",
		position: "centre",
	});
	const targets = {
		avif: diskPath(context.outDir, candidate.avifSrc),
		webp: diskPath(context.outDir, candidate.webpSrc),
	};
	await mkdir(path.dirname(targets.avif), { recursive: true });
	await Promise.all(
		(["avif", "webp"] as const).map(async (format) => {
			const key = cacheKey(context, source, candidate, format);
			const cachedFile = path.join(context.cacheDir, `${key}.${format}`);
			await context.ensureCached({ image: image.clone(), format, cachedFile });
			await copyFile(cachedFile, targets[format]);
		}),
	);
}

async function writePlan(
	context: BuildContext,
	plan: RenditionPlan,
): Promise<number> {
	const source = await readSource(diskPath(context.sourceRoot, plan.source));
	for (const candidate of plan.candidates) {
		await writeCandidate(context, source, candidate);
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
	const context: BuildContext = {
		sourceRoot: options.sourceRoot ?? "static",
		outDir: options.outDir ?? "dist",
		cacheDir: options.cacheDir ?? ".cache/renditions",
		pipeline: sha256(await readFile(fileURLToPath(import.meta.url))),
		ensureCached: cacheFiller(),
	};
	await mkdir(context.cacheDir, { recursive: true });
	const counts = await Promise.all(
		plans.map((plan) => writePlan(context, plan)),
	);
	return counts.reduce((total, count) => total + count, 0);
}
