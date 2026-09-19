import {
	type Essay,
	type Project,
	pickFeatured,
	topicSlug,
} from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, formatDate, page } from "./layout.js";
import { projectEntry } from "./project.js";

export { formatDate };

// Provisional homepage copy. Edit freely; no logic depends on it.
const HERO_TITLE = "Philosophy, technology, and the human condition.";
const HERO_STANDFIRST =
	"Essays and notes on ethics, phenomenology, technology, software, and related questions.";

export function topicLink(topic: string): string {
	return `<a href="${siteUrl(`/topics/${topicSlug(topic)}/`)}">${escapeHtml(topic)}</a>`;
}

export interface Cover {
	src: string;
	alt: string;
}

export function extractCover(html: string): Cover | undefined {
	const tag = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(html)?.[0];
	if (tag === undefined) {
		return undefined;
	}
	const src = /src="([^"]*)"/i.exec(tag)?.[1];
	if (src === undefined || src === "") {
		return undefined;
	}
	const alt = /alt="([^"]*)"/i.exec(tag)?.[1] ?? "";
	return { src, alt };
}

function essayCover(essay: Essay): string {
	const cover = extractCover(essay.html);
	if (cover === undefined) {
		return "";
	}
	return `<div class="card-media"><img src="${escapeHtml(cover.src)}" alt="${escapeHtml(cover.alt)}" loading="lazy" decoding="async"></div>`;
}

export function essayEntry(essay: Essay): string {
	const url = siteUrl(`/essays/${essay.slug}/`);
	const cover = essayCover(essay);
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics =
		essay.topics.length > 0
			? `<span class="entry-topics">${essay.topics.map((topic) => topicLink(topic)).join("")}</span>`
			: "";
	return `<li><article class="card">
${cover}<div class="card-body">
<h3 class="card-title"><a href="${url}">${escapeHtml(essay.title)}</a></h3>
${description}
<p class="entry-meta">${topics}<time datetime="${essay.date.toISOString()}">${formatDate(essay.date)}</time></p>
</div></article></li>`;
}

export function essayIndexPage(essays: Essay[]): string {
	const entries = essays.map((essay) => essayEntry(essay)).join("\n");
	const count = essays.length === 1 ? "1 essay" : `${essays.length} essays`;
	return page({
		title: "Essays",
		content: `<div class="wrap essays-page"><h1>Essays</h1><p class="essay-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
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
		scripts: [siteUrl("/hero.js")],
		styles: [siteUrl("/styles.css"), siteUrl("/hero.css")],
		content: `<section class="hero" data-hero>
<div class="hero-visual" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="wrap hero-inner">
<h1>${escapeHtml(HERO_TITLE)}</h1>
<p class="hero-standfirst">${escapeHtml(HERO_STANDFIRST)}</p>
<p class="hero-cta"><a href="${siteUrl("/essays/")}">Read essays</a> <a href="${siteUrl("/projects/")}">Browse projects</a></p>
</div>
</section>
${essaySection}${projectsSection}`,
	});
}
