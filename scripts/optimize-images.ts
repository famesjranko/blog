import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/**
 * JPEG-only WebP sidecar generator.
 *
 * Repository invariant: every `.jpg`/`.jpeg` under `static/img`
 * has a same-name `.webp` sidecar. Rendering (`src/images.ts`)
 * maps URLs purely by convention and never checks the disk, so
 * this script owns the guarantee.
 *
 * Out of scope by design: PNG diagrams, SVG artwork, existing WebP.
 *
 * Usage:
 *   npm run images          regenerate all sidecars (always rewrites;
 *                           deterministic output, no mtime cleverness)
 *   npm run images:check    verify sidecars exist, without loading sharp
 */
const IMG_ROOT = "static/img";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;

function isJpegFile(name: string): boolean {
	const lower = name.toLowerCase();
	return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
}

function webpPath(jpegPath: string): string {
	return jpegPath.replace(/\.(jpe?g)$/i, ".webp");
}

async function listJpegs(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				return listJpegs(full);
			}
			return Promise.resolve(isJpegFile(entry.name) ? [full] : []);
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

async function check(): Promise<number> {
	const jpegs = await listJpegs(IMG_ROOT);
	const missing = missingSidecars(jpegs, existsSync);
	for (const jpeg of missing) {
		console.error(`missing WebP sidecar: ${webpPath(jpeg)} (from ${jpeg})`);
	}
	if (missing.length > 0) {
		console.error(`images:check: ${missing.length} missing sidecar(s)`);
		return 1;
	}
	console.log(
		`images:check: OK (${jpegs.length} jpeg(s), all sidecars present)`,
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
	const jpegs = await listJpegs(IMG_ROOT);
	if (jpegs.length === 0) {
		console.log("images: nothing to convert");
		return 0;
	}
	let totalBefore = 0;
	let totalAfter = 0;
	for (const jpeg of jpegs) {
		const result = await convertOne(jpeg);
		totalBefore += result.before;
		totalAfter += result.after;
	}
	console.log(
		`images: ${jpegs.length} file(s), ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)}`,
	);
	return 0;
}

if (process.argv.includes("--check")) {
	process.exitCode = await check();
} else {
	process.exitCode = await generate();
}
