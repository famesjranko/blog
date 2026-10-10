import {
	type Essay,
	type Project,
	pickFeatured,
	writingPath,
} from "../content.js";
import { siteUrl } from "../site.js";
import { hero, heroAssets } from "./hero.js";
import { cardClass, cardCover, escapeHtml, page, topicLink } from "./layout.js";
import { recentNotesSection } from "./notes.js";
import { projectEntry } from "./project.js";

// Homepage hero copy. Edit freely; no logic depends on it.
// Non-breaking spaces keep each phrase whole and the separator on the
// phrase before it, so a narrow screen wraps only after a separator.
const HERO_EYEBROW = ["BACKEND & SYSTEMS ENGINEER", "MELBOURNE"]
	.map((phrase) => phrase.replaceAll(" ", "\u00a0"))
	.join("\u00a0· ");
const HERO_TITLE_LINES = ["From philosophy", "to software"];
const HERO_STANDFIRST =
	"A personal collection of essays, projects, AI engineering, and notes.";

/** Card title level: h2 straight under a page h1, h3 inside a homepage section. */
export type CardHeading = 2 | 3;

export function essayEntry(essay: Essay, heading: CardHeading = 2): string {
	const url = siteUrl(writingPath(essay));
	const cover = cardCover(essay);
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics = `<span class="entry-topics">${essay.topics.map((topic) => topicLink(topic)).join("")}</span>`;
	return `<li><article class="${cardClass(essay)}">
${cover}<div class="card-body">
<h${heading} class="card-title"><a href="${url}">${escapeHtml(essay.title)}</a></h${heading}>
${description}
<p class="entry-meta">${topics}</p>
</div></article></li>`;
}

export function essayIndexPage(essays: Essay[]): string {
	const entries = essays.map((essay) => essayEntry(essay)).join("\n");
	const count = essays.length === 1 ? "1 essay" : `${essays.length} essays`;
	return page({
		title: "Essays",
		canonicalPath: "/essays/",
		description: "Essays on philosophy, knowledge, ethics, and technology.",
		content: `<div class="wrap index-page"><h1>Essays</h1><p class="index-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
	});
}

function featuredSection(options: {
	id: string;
	heading: string;
	indexUrl: string;
	indexLabel: string;
	entry: string;
}): string {
	if (options.entry === "") {
		return "";
	}
	const headingId = `${options.id}-heading`;
	return `<section id="${options.id}" class="wrap recent" aria-labelledby="${headingId}">
<h2 id="${headingId}">${options.heading}</h2>
<ol class="card-grid">${options.entry}</ol>
<p class="more-link"><a href="${options.indexUrl}">${options.indexLabel}</a></p>
</section>`;
}

/** The hero is decoration, so the skip link lands on the first real section. */
function skipTarget(counts: {
	essays: number;
	notes: number;
	projects: number;
	aiEngineering: number;
}): string {
	if (counts.essays > 0) {
		return "featured-essays";
	}
	if (counts.projects > 0) {
		return "featured-projects";
	}
	if (counts.aiEngineering > 0) {
		return "featured-ai-engineering";
	}
	return counts.notes > 0 ? "recent-notes" : "main";
}

function homeSections(
	essays: Essay[],
	projects: Project[],
	aiEngineering: Essay[],
): string {
	return (
		featuredSection({
			id: "featured-essays",
			heading: "Featured essays",
			indexUrl: siteUrl("/essays/"),
			indexLabel: "More essays",
			entry: pickFeatured(essays)
				.map((e) => essayEntry(e, 3))
				.join("\n"),
		}) +
		featuredSection({
			id: "featured-projects",
			heading: "Featured projects",
			indexUrl: siteUrl("/projects/"),
			indexLabel: "More projects",
			entry: pickFeatured(projects)
				.map((p) => projectEntry(p, 3))
				.join("\n"),
		}) +
		featuredSection({
			id: "featured-ai-engineering",
			heading: "AI Engineering",
			indexUrl: siteUrl("/ai-engineering/"),
			indexLabel: "More AI engineering",
			entry: pickFeatured(aiEngineering)
				.map((e) => essayEntry(e, 3))
				.join("\n"),
		})
	);
}

export function homePage(
	essays: Essay[],
	projects: Project[] = [],
	notes: Essay[] = [],
	aiEngineering: Essay[] = [],
): string {
	const assets = heroAssets();
	return page({
		title: "Andrew J. McDonald",
		canonicalPath: "/",
		description: HERO_STANDFIRST,
		skipTo: skipTarget({
			essays: essays.length,
			notes: notes.length,
			projects: projects.length,
			aiEngineering: aiEngineering.length,
		}),
		scripts: assets.scripts,
		styles: [...assets.styles, siteUrl("/css/notes.css")],
		content: `${hero({
			eyebrow: HERO_EYEBROW,
			titleLines: HERO_TITLE_LINES,
			standfirst: HERO_STANDFIRST,
		})}
${homeSections(essays, projects, aiEngineering)}${recentNotesSection(notes)}`,
	});
}
