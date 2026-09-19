import {
	type Essay,
	type Project,
	pickFeatured,
	topicSlug,
} from "../content.js";
import { siteUrl } from "../site.js";
import { cardCover, escapeHtml, page } from "./layout.js";
import { projectEntry } from "./project.js";

// Homepage hero copy. Edit freely; no logic depends on it.
const HERO_EYEBROW = "ANDREW MCDONALD · BACKEND & SYSTEMS ENGINEER · MELBOURNE";
const HERO_TITLE_LINES = ["From philosophy", "to software"];
const HERO_STANDFIRST = "A personal collection of essays, projects, and notes.";

export function topicLink(topic: string): string {
	return `<a href="${siteUrl(`/topics/${topicSlug(topic)}/`)}">${escapeHtml(topic)}</a>`;
}

export function essayEntry(essay: Essay): string {
	const url = siteUrl(`/essays/${essay.slug}/`);
	const cover = cardCover(essay.cover, essay.coverAlt, essay.slug);
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics = `<span class="entry-topics">${essay.topics.map((topic) => topicLink(topic)).join("")}</span>`;
	return `<li><article class="card">
${cover}<div class="card-body">
<h3 class="card-title"><a href="${url}">${escapeHtml(essay.title)}</a></h3>
${description}
<p class="entry-meta">${topics}</p>
</div></article></li>`;
}

export function essayIndexPage(essays: Essay[]): string {
	const entries = essays.map((essay) => essayEntry(essay)).join("\n");
	const count = essays.length === 1 ? "1 essay" : `${essays.length} essays`;
	return page({
		title: "Essays",
		content: `<div class="wrap index-page"><h1>Essays</h1><p class="index-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
	});
}

function featuredSection(options: {
	headingId: string;
	heading: string;
	indexUrl: string;
	indexLabel: string;
	entry: string;
}): string {
	return `<section class="wrap recent" aria-labelledby="${options.headingId}">
<h2 id="${options.headingId}">${options.heading}</h2>
<ol class="card-grid">${options.entry}</ol>
<p class="more-link"><a href="${options.indexUrl}">${options.indexLabel}</a></p>
</section>`;
}

export function homePage(essays: Essay[], projects: Project[] = []): string {
	const featuredEssays = pickFeatured(essays);
	const featuredProjects = pickFeatured(projects);
	const essaySection =
		featuredEssays.length === 0
			? ""
			: featuredSection({
					headingId: "featured-essays-heading",
					heading: "Featured essays",
					indexUrl: siteUrl("/essays/"),
					indexLabel: "More essays",
					entry: featuredEssays.map((e) => essayEntry(e)).join("\n"),
				});
	const projectsSection =
		featuredProjects.length === 0
			? ""
			: featuredSection({
					headingId: "featured-projects-heading",
					heading: "Featured projects",
					indexUrl: siteUrl("/projects/"),
					indexLabel: "More projects",
					entry: featuredProjects.map((p) => projectEntry(p)).join("\n"),
				});
	return page({
		title: "Andrew J. McDonald",
		description: HERO_STANDFIRST,
		scripts: [{ src: siteUrl("/hero.js"), type: "module" }],
		styles: [siteUrl("/styles.css"), siteUrl("/hero.css")],
		content: `<section class="hero" data-hero>
<div class="hero-visual" aria-hidden="true"><span></span><span></span><span></span></div>
<canvas class="hero-canvas" data-thought-field aria-hidden="true"></canvas>
<div class="wrap hero-inner">
<p class="hero-eyebrow">${escapeHtml(HERO_EYEBROW)}</p>
<h1>${HERO_TITLE_LINES.map((line) => escapeHtml(line)).join("<br>")}</h1>
<p class="hero-standfirst">${escapeHtml(HERO_STANDFIRST)}</p>
<p class="hero-cta"><a href="${siteUrl("/essays/")}">Read essays</a> <a href="${siteUrl("/projects/")}">Browse projects</a></p>
</div>
</section>
${essaySection}${projectsSection}`,
	});
}
