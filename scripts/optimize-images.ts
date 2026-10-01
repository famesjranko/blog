import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { checkPlaceholders, generatePlaceholders } from "./placeholders.js";

/**
 * Image pipeline: source JPEG budget, placeholders, and the
 * pixel-size table. Responsive AVIF and WebP renditions are generated
 * into `dist/` by the build, not here.
 *
 * Repository invariants:
 *   1. no JPEG is wider than MAX_WIDTH or heavier than MAX_JPEG_BYTES,
 *      since the JPEG is the fallback for browsers that use no
 *      rendition;
 *   2. `src/image-dimensions.json` lists the pixel size of every image
 *      under `static/img`, keyed by its site path;
 *   3. every published piece without a cover has a rendered placeholder
 *      under `static/img/placeholders` (see `scripts/placeholders.ts`).
 *
 * Rendering (`src/images.ts`) reads the table at import time; it never
 * touches the disk. This script owns these guarantees.
 *
 * Usage:
 *   npm run images          render missing placeholders, shrink
 *                           oversized JPEGs in place, regenerate
 *                           the table
 *   npm run images:check    fail when a placeholder is missing or
 *                           stale, a JPEG is oversized, or the table
 *                           differs from the images on disk
 */
const IMG_ROOT = "static/img";
const TABLE_PATH = "src/image-dimensions.json";
const MAX_WIDTH = 1600;
const MAX_JPEG_BYTES = 400 * 1024;
const JPEG_QUALITY = 82;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".webp"];

function isJpegFile(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function isImageFile(name: string): boolean {
	const lower = name.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** `static/img/a/b.jpg` -> `/img/a/b.jpg`, the src content refers to. */
function siteKey(file: string): string {
	return `/${path.relative("static", file).split(path.sep).join("/")}`;
}

async function listFiles(
	dir: string,
	keep: (name: string) => boolean,
): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				return listFiles(full, keep);
			}
			return Promise.resolve(keep(entry.name) ? [full] : []);
		}),
	);
	return nested.flat().sort();
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

interface Size {
	width: number;
	height: number;
}

async function readTable(): Promise<string> {
	const { default: sharp } = await import("sharp");
	const files = await listFiles(IMG_ROOT, isImageFile);
	const table: Record<string, Size> = {};
	for (const file of files) {
		const { width, height } = await sharp(file).metadata();
		if (width === undefined || height === undefined) {
			throw new Error(`cannot read pixel size of ${file}`);
		}
		table[siteKey(file)] = { width, height };
	}
	return `${JSON.stringify(table, null, "\t")}\n`;
}

/**
 * A JPEG is oversized when it is wider than the cap or heavier than the
 * byte budget. Both are cheap to test and either one means the file
 * has not been through `npm run images`.
 */
async function oversizedReason(jpeg: string): Promise<string | undefined> {
	const { default: sharp } = await import("sharp");
	const { width } = await sharp(jpeg).metadata();
	if (width !== undefined && width > MAX_WIDTH) {
		return `${width}px wide (max ${MAX_WIDTH})`;
	}
	const bytes = (await stat(jpeg)).size;
	if (bytes > MAX_JPEG_BYTES) {
		return `${formatBytes(bytes)} (max ${formatBytes(MAX_JPEG_BYTES)})`;
	}
	return undefined;
}

async function oversizedJpegs(jpegs: string[]): Promise<string[]> {
	const found: string[] = [];
	for (const jpeg of jpegs) {
		const reason = await oversizedReason(jpeg);
		if (reason !== undefined) {
			found.push(`${jpeg}: ${reason}`);
		}
	}
	return found;
}

async function check(): Promise<number> {
	const placeholderProblems = await checkPlaceholders();
	for (const line of placeholderProblems) {
		console.error(line);
	}
	if (placeholderProblems.length > 0) {
		console.error(
			`images:check: ${placeholderProblems.length} placeholder problem(s) (run \`npm run images\`)`,
		);
		return 1;
	}
	const jpegs = await listFiles(IMG_ROOT, isJpegFile);
	const oversized = await oversizedJpegs(jpegs);
	for (const line of oversized) {
		console.error(`oversized JPEG: ${line}`);
	}
	if (oversized.length > 0) {
		console.error(
			`images:check: ${oversized.length} oversized jpeg(s) (run \`npm run images\`)`,
		);
		return 1;
	}
	const stored = existsSync(TABLE_PATH)
		? await readFile(TABLE_PATH, "utf8")
		: "";
	if (stored !== (await readTable())) {
		console.error(
			`images:check: ${TABLE_PATH} is stale (run \`npm run images\`)`,
		);
		return 1;
	}
	console.log(
		`images:check: OK (${jpegs.length} jpeg(s), placeholders present, size table current)`,
	);
	return 0;
}

/**
 * Shrink an oversized JPEG in place: bake in EXIF orientation, cap the
 * width, recompress with mozjpeg, drop metadata. Files already within
 * budget are left byte-for-byte alone so repeated runs never degrade
 * them. Refuses to leave a file that is still over budget, since the
 * check would then fail forever.
 */
async function shrinkJpeg(jpeg: string): Promise<void> {
	const reason = await oversizedReason(jpeg);
	if (reason === undefined) {
		return;
	}
	const { default: sharp } = await import("sharp");
	const before = (await stat(jpeg)).size;
	const shrunk = await sharp(jpeg)
		.rotate()
		.resize({ width: MAX_WIDTH, withoutEnlargement: true })
		.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
		.toBuffer();
	await writeFile(jpeg, shrunk);
	console.log(
		`${jpeg} (${formatBytes(before)}, ${reason}) -> ${formatBytes(shrunk.length)}`,
	);
	const still = await oversizedReason(jpeg);
	if (still !== undefined) {
		throw new Error(`${jpeg} is still oversized after shrinking: ${still}`);
	}
}

async function generate(): Promise<number> {
	await generatePlaceholders();
	const jpegs = await listFiles(IMG_ROOT, isJpegFile);
	for (const jpeg of jpegs) {
		await shrinkJpeg(jpeg);
	}
	console.log(`images: ${jpegs.length} jpeg(s) within budget`);
	await writeFile(TABLE_PATH, await readTable(), "utf8");
	console.log(`images: wrote ${TABLE_PATH}`);
	return 0;
}

if (process.argv.includes("--check")) {
	process.exitCode = await check();
} else {
	process.exitCode = await generate();
}
