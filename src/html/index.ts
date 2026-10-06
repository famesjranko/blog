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
const HERO_EYEBROW = "ANDREW MCDONALD · BACKEND & SYSTEMS ENGINEER · MELBOURNE";
const HERO_TITLE_LINES = ["From philosophy", "to software"];
const HERO_STANDFIRST = "A personal collection of essays, projects, and notes.";

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
}): string {
	if (counts.essays > 0) {
		return "featured-essays";
	}
	if (counts.notes > 0) {
		return "recent-notes";
	}
	return counts.projects > 0 ? "featured-projects" : "main";
}

export function homePage(
	essays: Essay[],
	projects: Project[] = [],
	notes: Essay[] = [],
): string {
	const featuredEssays = pickFeatured(essays);
	const featuredProjects = pickFeatured(projects);
	const essaySection =
		featuredEssays.length === 0
			? ""
			: featuredSection({
					id: "featured-essays",
					heading: "Featured essays",
					indexUrl: siteUrl("/essays/"),
					indexLabel: "More essays",
					entry: featuredEssays.map((e) => essayEntry(e, 3)).join("\n"),
				});
	const projectsSection =
		featuredProjects.length === 0
			? ""
			: featuredSection({
					id: "featured-projects",
					heading: "Featured projects",
					indexUrl: siteUrl("/projects/"),
					indexLabel: "More projects",
					entry: featuredProjects.map((p) => projectEntry(p, 3)).join("\n"),
				});
	const assets = heroAssets();
	return page({
		title: "Andrew J. McDonald",
		canonicalPath: "/",
		description: HERO_STANDFIRST,
		skipTo: skipTarget({
			essays: featuredEssays.length,
			notes: notes.length,
			projects: featuredProjects.length,
		}),
		scripts: assets.scripts,
		styles: [...assets.styles, siteUrl("/css/notes.css")],
		content: `${hero({
			eyebrow: HERO_EYEBROW,
			titleLines: HERO_TITLE_LINES,
			standfirst: HERO_STANDFIRST,
			actions: [
				{ label: "Read essays", href: siteUrl("/essays/") },
				{ label: "Browse projects", href: siteUrl("/projects/") },
			],
		})}
${essaySection}${recentNotesSection(notes)}${projectsSection}`,
	});
}
