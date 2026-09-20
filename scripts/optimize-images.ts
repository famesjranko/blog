import { existsSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Image pipeline: WebP sidecars and the pixel-size table.
 *
 * Repository invariants:
 *   1. every `.jpg`/`.jpeg` under `static/img` has a same-name `.webp`
 *      sidecar;
 *   2. `src/image-dimensions.json` lists the pixel size of every image
 *      under `static/img`, keyed by its site path.
 *
 * Rendering (`src/images.ts`) maps URLs purely by convention and reads
 * the table at import time; it never touches the disk. This script owns
 * both guarantees.
 *
 * Usage:
 *   npm run images          regenerate sidecars and the table (always
 *                           rewrites; deterministic output)
 *   npm run images:check    fail when a sidecar is missing or the table
 *                           differs from the images on disk
 */
const IMG_ROOT = "static/img";
const TABLE_PATH = "src/image-dimensions.json";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg", ".webp"];

function isJpegFile(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function isImageFile(name: string): boolean {
	const lower = name.toLowerCase();
	return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function webpPath(jpegPath: string): string {
	return jpegPath.replace(/\.(jpe?g)$/i, ".webp");
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

/** Pure existence check over an explicit file list. No sharp involved. */
export function missingSidecars(
	jpegs: string[],
	exists: (p: string) => boolean,
): string[] {
	return jpegs.filter((jpeg) => !exists(webpPath(jpeg)));
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

async function check(): Promise<number> {
	const jpegs = await listFiles(IMG_ROOT, isJpegFile);
	const missing = missingSidecars(jpegs, existsSync);
	for (const jpeg of missing) {
		console.error(`missing WebP sidecar: ${webpPath(jpeg)} (from ${jpeg})`);
	}
	if (missing.length > 0) {
		console.error(`images:check: ${missing.length} missing sidecar(s)`);
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
		`images:check: OK (${jpegs.length} jpeg(s), all sidecars present, size table current)`,
	);
	return 0;
}

async function convertOne(
	jpeg: string,
): Promise<{ before: number; after: number }> {
	const { default: sharp } = await import("sharp");
	const dst = webpPath(jpeg);
	const before = (await stat(jpeg)).size;
	await sharp(jpeg)
		.resize({ width: MAX_WIDTH, withoutEnlargement: true })
		.webp({ quality: WEBP_QUALITY, effort: 6 })
		.toFile(dst);
	const after = (await stat(dst)).size;
	console.log(
		`${jpeg} (${formatBytes(before)}) -> ${dst} (${formatBytes(after)})`,
	);
	return { before, after };
}

async function generate(): Promise<number> {
	const jpegs = await listFiles(IMG_ROOT, isJpegFile);
	let totalBefore = 0;
	let totalAfter = 0;
	for (const jpeg of jpegs) {
		const result = await convertOne(jpeg);
		totalBefore += result.before;
		totalAfter += result.after;
	}
	console.log(
		`images: ${jpegs.length} jpeg(s), ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)}`,
	);
	await writeFile(TABLE_PATH, await readTable(), "utf8");
	console.log(`images: wrote ${TABLE_PATH}`);
	return 0;
}

if (process.argv.includes("--check")) {
	process.exitCode = await check();
} else {
	process.exitCode = await generate();
}
