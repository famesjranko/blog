import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Essay, Project } from "./content.js";
import { essayPage } from "./html/essay.js";
import { essayIndexPage, homePage } from "./html/index.js";
import { projectIndexPage, projectPage } from "./html/project.js";
import { allTopics, topicPage } from "./html/topic.js";
import { SITE_NAME, escapeHtml } from "./html/layout.js";
import { absoluteSiteUrl } from "./site.js";

const FEED_DESCRIPTION = "Essays on philosophy.";

async function write(outDir: string, rel: string, body: string): Promise<void> {
	const full = path.join(outDir, rel);
	await mkdir(path.dirname(full), { recursive: true });
	await writeFile(full, body, "utf8");
}

export async function generateSite(
	essays: Essay[],
	projects: Project[],
	outDir = "dist",
): Promise<void> {
	assertUniqueSlugs("essay", essays);
	assertUniqueSlugs("project", projects);
	assertPredecessorsResolve(projects);
	for (const essay of essays) {
		await write(outDir, `essays/${essay.slug}/index.html`, essayPage(essay));
	}
	for (const project of projects) {
		await write(
			outDir,
			`projects/${project.slug}/index.html`,
			projectPage(project),
		);
	}
	await write(outDir, "index.html", homePage(essays, projects));
	await write(outDir, "essays/index.html", essayIndexPage(essays));
	await write(outDir, "projects/index.html", projectIndexPage(projects));
	for (const topic of allTopics(essays)) {
		await write(
			outDir,
			`topics/${topic.slug}/index.html`,
			topicPage(topic, essays),
		);
	}
	await write(outDir, "rss.xml", rss(essays));
	await write(outDir, "sitemap.xml", sitemap(essays, projects));
}

interface SluggedContent {
	slug: string;
	sourcePath: string;
}

function assertUniqueSlugs(kind: string, items: SluggedContent[]): void {
	const seen = new Map<string, string>();
	for (const item of items) {
		if (item.slug === "") {
			throw new Error(
				`${kind} ${JSON.stringify(item.sourcePath)} has an empty slug`,
			);
		}
		const first = seen.get(item.slug);
		if (first !== undefined) {
			throw new Error(
				`${kind}s ${JSON.stringify(first)} and ${JSON.stringify(item.sourcePath)} share slug ${JSON.stringify(item.slug)}`,
			);
		}
		seen.set(item.slug, item.sourcePath);
	}
}

/**
 * A predecessor link must resolve to a real project page, otherwise
 * the build would publish a dead cross-link. Fail loudly instead.
 */
function assertPredecessorsResolve(projects: Project[]): void {
	const slugs = new Set(projects.map((p) => p.slug));
	for (const project of projects) {
		if (project.predecessor !== undefined && !slugs.has(project.predecessor)) {
			throw new Error(
				`project ${JSON.stringify(project.slug)} has unknown predecessor ${JSON.stringify(project.predecessor)}`,
			);
		}
	}
}

function rssItem(essay: Essay): string {
	const url = absoluteSiteUrl(`/essays/${essay.slug}/`);
	const description =
		essay.description === undefined
			? ""
			: `<description>${escapeHtml(essay.description)}</description>`;
	return `<item><title>${escapeHtml(essay.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${description}<pubDate>${essay.date.toUTCString()}</pubDate></item>`;
}

/**
 * The newest essay dates the build. Using content rather than the clock
 * keeps the feed byte-identical across rebuilds of unchanged content.
 */
function rss(essays: Essay[]): string {
	const items = essays.map(rssItem).join("\n");
	const newest = essays.reduce<Date | undefined>(
		(latest, e) => (latest === undefined || e.date > latest ? e.date : latest),
		undefined,
	);
	const built =
		newest === undefined
			? ""
			: `<lastBuildDate>${newest.toUTCString()}</lastBuildDate>`;
	const self = absoluteSiteUrl("/rss.xml");
	return (
		`<?xml version="1.0" encoding="UTF-8"?>` +
		`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>` +
		`<title>${escapeHtml(SITE_NAME)}</title>` +
		`<link>${absoluteSiteUrl("/")}</link>` +
		`<description>${escapeHtml(FEED_DESCRIPTION)}</description>` +
		`<atom:link href="${self}" rel="self" type="application/rss+xml"/>` +
		`${built}${items}</channel></rss>`
	);
}

function sitemap(essays: Essay[], projects: Project[]): string {
	const urls = [
		"",
		"essays/",
		"projects/",
		...essays.map((e) => `essays/${e.slug}/`),
		...projects.map((p) => `projects/${p.slug}/`),
		...allTopics(essays).map((t) => `topics/${t.slug}/`),
	];
	const items = urls
		.map((u) => `<url><loc>${absoluteSiteUrl(`/${u}`)}</loc></url>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}
