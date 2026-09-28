import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildSite } from "./buildSite.js";

async function buildToTemp(): Promise<{ outDir: string; root: string }> {
	const root = await mkdtemp(path.join(tmpdir(), "blog-dist-"));
	const outDir = path.join(root, "dist");
	await buildSite(outDir, false);
	return { outDir, root };
}

async function listFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map(async (entry) => {
			const file = path.join(dir, entry.name);
			return entry.isDirectory() ? listFiles(file) : [file];
		}),
	);
	return nested.flat().sort();
}

interface RenditionReference {
	format: string;
	url: string;
	width: number;
}

const CARD_RENDITION = /\.card-\d+w\.(avif|webp)$/;
const BODY_RENDITION = /\.body-\d+w\.(avif|webp)$/;

const SOURCE_PATTERN =
	/<source type="image\/(avif|webp)" srcset="([^"]+)" sizes="[^"]+">/g;

function parseSrcset(format: string, srcset: string): RenditionReference[] {
	return srcset.split(", ").flatMap((item) => {
		const [url, descriptor] = item.split(" ");
		return url === undefined || descriptor === undefined
			? []
			: [{ format, url, width: Number.parseInt(descriptor, 10) }];
	});
}

function referencesFromHtml(html: string): RenditionReference[] {
	return [...html.matchAll(SOURCE_PATTERN)].flatMap((match) => {
		const format = match[1];
		const srcset = match[2];
		return format === undefined || srcset === undefined
			? []
			: parseSrcset(format, srcset);
	});
}

async function collectReferences(
	htmlFiles: string[],
): Promise<Map<string, RenditionReference>> {
	const pages = await Promise.all(
		htmlFiles.map((file) => readFile(file, "utf8")),
	);
	const references = pages.flatMap(referencesFromHtml);
	return new Map(references.map((reference) => [reference.url, reference]));
}

async function expectRendition(
	outDir: string,
	reference: RenditionReference,
): Promise<void> {
	const { default: sharp } = await import("sharp");
	const file = path.join(outDir, reference.url.replace(/^\/+/, ""));
	const metadata = await sharp(file).metadata();
	expect(metadata.format, reference.url).toBe(
		reference.format === "avif" ? "heif" : "webp",
	);
	expect(metadata.width, reference.url).toBe(reference.width);
	expect(metadata.height, reference.url).toBe(
		await expectedHeight(outDir, reference),
	);
}

/**
 * Cards crop to 16:9. Body renditions keep the aspect of the source JPEG,
 * which is read from the output rather than the dimensions table.
 */
async function expectedHeight(
	outDir: string,
	reference: RenditionReference,
): Promise<number> {
	if (CARD_RENDITION.test(reference.url)) {
		return (reference.width / 16) * 9;
	}
	const { default: sharp } = await import("sharp");
	const source = reference.url.replace(BODY_RENDITION, ".jpg");
	const { width, height } = await sharp(
		path.join(outDir, source.replace(/^\/+/, "")),
	).metadata();
	return Math.round((reference.width * height) / width);
}

function outputUrl(outDir: string, file: string): string {
	return `/${path.relative(outDir, file).split(path.sep).join("/")}`;
}

let outDir = "";
let root = "";

beforeAll(async () => {
	vi.stubEnv("BASE_PATH", "");
	({ outDir, root } = await buildToTemp());
}, 120000);

afterAll(async () => {
	await rm(root, { recursive: true, force: true });
	vi.unstubAllEnvs();
});

describe("build output", () => {
	it("emits site-wide Cloudflare security headers", async () => {
		const headers = await readFile(path.join(outDir, "_headers"), "utf8");

		expect(headers).toBe(
			"/*\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/img/*.avif\n  Cache-Control: public, max-age=86400\n\n/img/*.webp\n  Cache-Control: public, max-age=86400\n\n/img/*.jpg\n  Cache-Control: public, max-age=86400\n",
		);
	}, 30000);

	it("ships no three.js bundle and no module that imports one", async () => {
		const files = await readdir(path.join(outDir, "js"));
		expect(files.filter((name) => name.startsWith("three"))).toEqual([]);
		for (const name of files.filter((file) => file.endsWith(".js"))) {
			const text = await readFile(path.join(outDir, "js", name), "utf8");
			expect(text, name).not.toMatch(/["']\.\/three/);
		}
	}, 30000);

	it("keeps scripts under js/ and stylesheets under css/, none at the root", async () => {
		const root = await readdir(outDir);
		expect(root.filter((name) => /\.(js|css)$/.test(name))).toEqual([]);
		const scripts = await readdir(path.join(outDir, "js"));
		expect(scripts).toContain("hero.js");
		expect(scripts).toContain("theme.js");
		expect(scripts).toContain("mobile-nav.js");
		const styles = await readdir(path.join(outDir, "css"));
		expect(styles).toEqual(
			expect.arrayContaining([
				"main.css",
				"header.css",
				"prose.css",
				"figures.css",
				"essay.css",
				"essay-patterns.css",
				"essay-discussion.css",
				"project.css",
				"diagrams.css",
				"hero.css",
			]),
		);
	}, 30000);
});

describe("responsive image build output", () => {
	it("emits every referenced rendition with its declared codec and dimensions", async () => {
		const files = await listFiles(outDir);
		const htmlFiles = files.filter((file) => file.endsWith(".html"));
		const references = await collectReferences(htmlFiles);
		expect(references.size).toBeGreaterThan(0);
		await Promise.all(
			[...references.values()].map((reference) =>
				expectRendition(outDir, reference),
			),
		);
		const renditionFiles = files
			.map((file) => outputUrl(outDir, file))
			.filter((url) => CARD_RENDITION.test(url) || BODY_RENDITION.test(url));
		expect(renditionFiles.sort()).toEqual([...references.keys()].sort());
	}, 30000);

	it("crops card renditions only for card sources", async () => {
		const files = await listFiles(outDir);
		const cardFiles = files
			.map((file) => outputUrl(outDir, file))
			.filter((url) => CARD_RENDITION.test(url));
		expect(
			cardFiles.some((file) => file.includes("connect4-debug-scores")),
		).toBe(false);
		expect(cardFiles.some((file) => file.includes("placeholders"))).toBe(false);
		expect(
			cardFiles.some((file) => file.includes("as-knowledge-holders")),
		).toBe(false);
	});

	it("serves the article cover as sized AVIF and WebP renditions", async () => {
		const html = await readFile(
			path.join(outDir, "essays/whatis-philosophy/index.html"),
			"utf8",
		);
		const body = html.slice(html.indexOf('<article class="prose'));
		const sources = referencesFromHtml(body);
		expect(sources).toContainEqual({
			format: "avif",
			url: "/img/essays/whatis-philosophy/cover.body-720w.avif",
			width: 720,
		});
		expect(sources).toContainEqual({
			format: "webp",
			url: "/img/essays/whatis-philosophy/cover.body-1280w.webp",
			width: 1280,
		});
	});
});
