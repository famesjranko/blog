import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { loadEssays, loadProjects } from "../src/content.js";
import { isInternalJpeg } from "../src/images.js";
import {
	PLACEHOLDER_DIR,
	type Piece,
	coverlessSlugs,
	placeholderFile,
	stalePlaceholders,
} from "../src/placeholder/files.js";
import { renderFluid } from "../src/placeholder/fluid.js";
import { makeRandom } from "../src/placeholder/noise.js";
import { accents, kmeans, pixelsOf } from "../src/placeholder/palette.js";

/**
 * Generated cover art for pieces that ship without a cover image.
 *
 * Every essay or project, draft or published, whose frontmatter has no
 * `cover` gets `static/img/placeholders/<slug>.jpg`, a fluid-ink render
 * seeded by the slug and coloured from the real covers. Drafts are
 * included so preview builds (SHOW_DRAFTS) have card art too. The file
 * is only rendered when missing, so re-runs never rewrite bytes; delete
 * the file to re-render it. `images:check` fails when one is missing or
 * when a stale one lingers after a piece gained a cover.
 */
const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 36;
const CLUSTERS = 6;
const JPEG_QUALITY = 86;

async function allPieces(): Promise<Piece[]> {
	const [essays, projects] = await Promise.all([
		loadEssays(undefined, true),
		loadProjects(undefined, true),
	]);
	return [...essays, ...projects];
}

async function presentPlaceholders(): Promise<string[]> {
	if (!existsSync(PLACEHOLDER_DIR)) {
		return [];
	}
	const names = await readdir(PLACEHOLDER_DIR);
	return names
		.filter((name) => name.toLowerCase().endsWith(".jpg"))
		.map((name) => path.join(PLACEHOLDER_DIR, name));
}

/** Accent colours clustered out of every internal JPEG cover. */
async function coverPool(pieces: readonly Piece[]): Promise<string[]> {
	const { default: sharp } = await import("sharp");
	const covers = pieces
		.map((piece) => piece.cover)
		.filter(
			(cover): cover is string => cover !== undefined && isInternalJpeg(cover),
		)
		.sort();
	const pool = new Set<string>();
	for (const cover of covers) {
		const { data, info } = await sharp(path.join("static", cover))
			.resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "fill" })
			.raw()
			.toBuffer({ resolveWithObject: true });
		const pixels = pixelsOf(new Uint8Array(data), info.channels);
		for (const hex of accents(kmeans(pixels, CLUSTERS, makeRandom(cover)))) {
			pool.add(hex);
		}
	}
	return [...pool].sort();
}

async function renderOne(slug: string, pool: string[]): Promise<void> {
	const { default: sharp } = await import("sharp");
	const image = renderFluid(slug, pool);
	await sharp(Buffer.from(image.data), {
		raw: { width: image.width, height: image.height, channels: 3 },
	})
		.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
		.toFile(placeholderFile(slug));
	console.log(`${placeholderFile(slug)}: rendered`);
}

/** Render missing placeholders and remove stale ones. */
export async function generatePlaceholders(): Promise<void> {
	const pieces = await allPieces();
	const needed = coverlessSlugs(pieces);
	const missing = needed.filter((slug) => !existsSync(placeholderFile(slug)));
	if (missing.length > 0) {
		await mkdir(PLACEHOLDER_DIR, { recursive: true });
		const pool = await coverPool(pieces);
		for (const slug of missing) {
			await renderOne(slug, pool);
		}
	}
	for (const stale of stalePlaceholders(await presentPlaceholders(), needed)) {
		await rm(stale);
		await rm(stale.replace(/\.jpg$/i, ".webp"), { force: true });
		console.log(`${stale}: removed (piece now has a cover)`);
	}
	console.log(
		`placeholders: ${needed.length} needed, ${missing.length} rendered`,
	);
}

/** Problems with the placeholder set, one line each; empty when fine. */
export async function checkPlaceholders(): Promise<string[]> {
	const needed = coverlessSlugs(await allPieces());
	const problems = needed
		.filter((slug) => !existsSync(placeholderFile(slug)))
		.map((slug) => `missing placeholder: ${placeholderFile(slug)} (${slug})`);
	for (const stale of stalePlaceholders(await presentPlaceholders(), needed)) {
		problems.push(`stale placeholder: ${stale}`);
	}
	return problems;
}
