import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type Essay, type Project, writingPath } from "./content.js";
import { essayPage } from "./html/essay.js";
import { errorPage } from "./html/error.js";
import { essayIndexPage, homePage } from "./html/index.js";
import { noteIndexPage } from "./html/notes.js";
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

export interface SiteContent {
	essays: Essay[];
	notes: Essay[];
	projects: Project[];
}

/** Essays and notes together, newest first, for topics and the feed. */
function allWriting({ essays, notes }: SiteContent): Essay[] {
	return [...essays, ...notes].sort(
		(a, b) => b.date.getTime() - a.date.getTime(),
	);
}

export async function generateSite(
	content: SiteContent,
	outDir = "dist",
): Promise<void> {
	const { essays, notes, projects } = content;
	assertUniqueSlugs("essay", essays);
	assertUniqueSlugs("note", notes);
	assertUniqueSlugs("project", projects);
	assertPredecessorsResolve(projects);
	const writing = allWriting(content);
	for (const piece of writing) {
		await write(outDir, `${writingPath(piece)}index.html`, essayPage(piece));
	}
	for (const project of projects) {
		await write(
			outDir,
			`projects/${project.slug}/index.html`,
			projectPage(project),
		);
	}
	await write(outDir, "index.html", homePage(essays, projects, notes));
	await write(outDir, "essays/index.html", essayIndexPage(essays));
	await write(outDir, "notes/index.html", noteIndexPage(notes));
	await write(outDir, "projects/index.html", projectIndexPage(projects));
	for (const topic of allTopics(writing)) {
		await write(
			outDir,
			`topics/${topic.slug}/index.html`,
			topicPage(topic, writing),
		);
	}
	await write(outDir, "404.html", errorPage(404));
	await write(outDir, "rss.xml", rss(writing));
	await write(outDir, "sitemap.xml", sitemap(writing, projects));
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
	const url = absoluteSiteUrl(writingPath(essay));
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
function rss(allEssays: Essay[]): string {
	const essays = allEssays.filter((e) => !e.draft);
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

/** Drafts (only present under SHOW_DRAFTS) stay out of crawler surfaces. */
function sitemap(allWriting: Essay[], allProjects: Project[]): string {
	const writing = allWriting.filter((e) => !e.draft);
	const projects = allProjects.filter((p) => !p.draft);
	const urls = [
		"/",
		"/essays/",
		"/notes/",
		"/projects/",
		...writing.map(writingPath),
		...projects.map((p) => `/projects/${p.slug}/`),
		...allTopics(writing).map((t) => `/topics/${t.slug}/`),
	];
	const items = urls
		.map((u) => `<url><loc>${absoluteSiteUrl(u)}</loc></url>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}
