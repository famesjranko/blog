import type { Project } from "../content.js";
import { siteUrl } from "../site.js";
import type { CardHeading } from "./index.js";
import { articleMeta } from "./articleMeta.js";
import { cardClass, cardCover, coverSrc, escapeHtml, page } from "./layout.js";
import { titleHtml } from "./titleText.js";

const ORIGIN_LABELS: Record<Project["origin"], string> = {
	university: "University project",
	professional: "Professional project",
	personal: "Personal project",
};

export function originLabel(origin: Project["origin"]): string {
	return ORIGIN_LABELS[origin];
}

function stackList(stack: string[]): string {
	if (stack.length === 0) {
		return "";
	}
	const items = stack.map((s) => `<span>${escapeHtml(s)}</span>`).join("");
	return `<span class="entry-topics">${items}</span>`;
}

function facetList(project: Project): string {
	const origin = `<span class="project-origin">${originLabel(project.origin)}</span>`;
	const items = project.stack
		.map((s) => `<span>${escapeHtml(s)}</span>`)
		.join("");
	return `<span class="entry-topics">${origin}${items}</span>`;
}

function repoLink(repo: string | undefined): string {
	if (repo === undefined) {
		return "";
	}
	return `<a href="${escapeHtml(repo)}" target="_blank" rel="noopener noreferrer">Repository</a>`;
}

export function projectEntry(
	project: Project,
	heading: CardHeading = 2,
): string {
	const url = siteUrl(`/projects/${project.slug}/`);
	const cover = cardCover(project);
	const description =
		project.description !== undefined
			? `<p class="entry-desc">${escapeHtml(project.description)}</p>`
			: "";
	return `<li><article class="${cardClass(project)}">${cover}<div class="card-body">
<h${heading} class="card-title"><a href="${url}">${titleHtml(project.title)}</a></h${heading}>
${description}
<p class="entry-meta">${facetList(project)}</p>
</div></article></li>`;
}

export function projectIndexPage(projects: Project[]): string {
	const entries = projects.map((p) => projectEntry(p)).join("\n");
	const count =
		projects.length === 1 ? "1 project" : `${projects.length} projects`;
	return page({
		title: "Projects",
		canonicalPath: "/projects/",
		description:
			"Software projects, from university coursework to professional and personal builds.",
		content: `<div class="wrap index-page"><h1>Projects</h1><p class="index-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
	});
}

function factRow(label: string, body: string): string {
	return `<div class="project-fact"><dt>${label}</dt><dd>${body}</dd></div>`;
}

function projectFacts(project: Project): string {
	const rows: string[] = [];
	const stack = stackList(project.stack);
	if (stack !== "") {
		rows.push(factRow("Stack", stack));
	}
	const repo = repoLink(project.repo);
	if (repo !== "") {
		rows.push(factRow("Code", repo));
	}
	if (project.predecessor !== undefined) {
		const url = siteUrl(`/projects/${project.predecessor}/`);
		const body = `<span class="project-predecessor">Extended from <a href="${url}">${escapeHtml(project.predecessor)}</a>.</span>`;
		rows.push(factRow("Lineage", body));
	}
	if (rows.length === 0) {
		return "";
	}
	return `<dl class="project-facts">${rows.join("")}</dl>`;
}

export function projectPage(project: Project): string {
	const lede =
		project.description !== undefined
			? `<p class="project-lede">${escapeHtml(project.description)}</p>`
			: "";
	const facts = projectFacts(project);
	const side =
		facts === ""
			? ""
			: `<aside class="project-side" aria-label="Project facts">${facts}</aside>`;
	const meta = articleMeta({
		label: originLabel(project.origin),
		date: project.date,
		readingMinutes: project.readingMinutes,
		draft: project.draft,
	});
	return page({
		title: project.title,
		canonicalPath: `/projects/${project.slug}/`,
		socialImage: coverSrc(project),
		...(project.cover === undefined || project.coverAlt === undefined
			? {}
			: { socialImageAlt: project.coverAlt }),
		...(project.description === undefined
			? {}
			: { description: project.description }),
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/prose.css"),
			siteUrl("/css/figures.css"),
			siteUrl("/css/project.css"),
			siteUrl("/css/diagrams.css"),
			siteUrl("/css/lightbox.css"),
		],
		scripts: [siteUrl("/js/lightbox.js"), siteUrl("/js/video-embed.js")],
		content: `<div class="wrap"><article class="prose project">
<header class="project-header">
${meta}
<h1>${titleHtml(project.title)}</h1>
${lede}
</header>
<div class="project-grid">${side}<div class="project-main">${project.html}</div></div>
</article></div>`,
	});
}
