import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Essay, Project } from "./content.js";
import { essayPage } from "./html/essay.js";
import { essayIndexPage, homePage } from "./html/index.js";
import { projectIndexPage, projectPage } from "./html/project.js";
import { allTopics, topicPage } from "./html/topic.js";
import { escapeHtml } from "./html/layout.js";
import { siteUrl } from "./site.js";

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

function rss(essays: Essay[]): string {
	const items = essays
		.map(
			(e) =>
				`<item><title>${escapeHtml(e.title)}</title><link>${siteUrl(`/essays/${e.slug}/`)}</link><pubDate>${e.date.toUTCString()}</pubDate></item>`,
		)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Philosophy</title><link>${siteUrl("/")}</link>${items}</channel></rss>`;
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
		.map((u) => `<url><loc>${siteUrl(`/${u}`)}</loc></url>`)
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}
