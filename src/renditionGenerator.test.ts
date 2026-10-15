import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { articleImagePlans } from "./articleImages.js";
import { generateRenditions } from "./renditionGenerator.js";
import type { RenditionPlan } from "./renditions.js";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), "renditions-"));
	temporaryRoots.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) =>
			rm(root, {
				recursive: true,
				force: true,
			}),
		),
	);
});

const RED = { r: 255, g: 0, b: 0 };
const BLUE = { r: 0, g: 0, b: 255 };

/** Writes a solid 64x36 JPEG at `static/img/source.jpg` under the root. */
async function writeSource(
	root: string,
	background: typeof RED,
): Promise<void> {
	await mkdir(path.join(root, "static/img"), { recursive: true });
	await sharp({ create: { width: 64, height: 36, channels: 3, background } })
		.jpeg()
		.toFile(path.join(root, "static/img/source.jpg"));
}

interface Size {
	width: number;
	height: number;
}

function planFor(sizes: readonly Size[]): RenditionPlan {
	return {
		source: "/img/source.jpg",
		candidates: sizes.map(({ width, height }) => ({
			width,
			height,
			avifSrc: `/img/source.${width}x${height}.avif`,
			webpSrc: `/img/source.${width}x${height}.webp`,
		})),
	};
}

const SMALL = { width: 32, height: 18 };

async function generate(root: string, plan: RenditionPlan, outDir: string) {
	return generateRenditions([plan], {
		sourceRoot: path.join(root, "static"),
		outDir: path.join(root, outDir),
		cacheDir: path.join(root, "cache"),
	});
}

describe("generateRenditions", () => {
	it("rejects the build when a planned source is missing", async () => {
		const root = await temporaryRoot();
		await expect(
			generateRenditions(
				articleImagePlans(["/img/essays/dreyfus-review/cover.jpg"]),
				{
					sourceRoot: path.join(root, "missing-static"),
					outDir: path.join(root, "dist"),
					cacheDir: path.join(root, "cache"),
				},
			),
		).rejects.toThrow();
	});

	it("keeps a separate encoding for each candidate size", async () => {
		// Given one source planned at two widths, and at two heights for one width.
		const root = await temporaryRoot();
		await writeSource(root, RED);
		const sizes = [SMALL, { width: 32, height: 32 }, { width: 48, height: 27 }];

		// When the plan is generated.
		await generate(root, planFor(sizes), "dist");

		// Then each rendition has its own planned dimensions.
		const actual = await Promise.all(
			sizes.map(async ({ width, height }) => {
				const file = `dist/img/source.${width}x${height}.avif`;
				const metadata = await sharp(path.join(root, file)).metadata();
				return { width: metadata.width, height: metadata.height };
			}),
		);
		expect(actual).toEqual(sizes);
	});
});

describe("rendition cache", () => {
	it("reuses a cached encoding instead of encoding again", async () => {
		// Given a rendition generated once.
		const root = await temporaryRoot();
		await writeSource(root, RED);
		await generate(root, planFor([SMALL]), "first");
		// And every cache entry replaced with marker bytes.
		const cacheDir = path.join(root, "cache");
		const entries = await readdir(cacheDir);
		await Promise.all(
			entries.map((name) => writeFile(path.join(cacheDir, name), "cached")),
		);

		// When the same plan is generated into a fresh output directory.
		await generate(root, planFor([SMALL]), "second");

		// Then the output is the cached entry, not a new encoding.
		const output = await readFile(
			path.join(root, "second/img/source.32x18.avif"),
		);
		expect(output.toString()).toBe("cached");
	});

	it("encodes again when the source image changes", async () => {
		// Given a rendition generated from a red source.
		const root = await temporaryRoot();
		await writeSource(root, RED);
		await generate(root, planFor([SMALL]), "first");
		// And the source replaced by a blue image at the same path.
		await writeSource(root, BLUE);

		// When the same plan is generated again.
		await generate(root, planFor([SMALL]), "second");

		// Then the rendition shows the blue source, not the stale red one.
		const { dominant } = await sharp(
			path.join(root, "second/img/source.32x18.webp"),
		).stats();
		expect(dominant.b).toBeGreaterThan(200);
		expect(dominant.r).toBeLessThan(50);
	});
});
