import type { Project } from "../content.js";
import { siteUrl } from "../site.js";
import { cardCover, escapeHtml, page } from "./layout.js";

export function originLabel(origin: Project["origin"]): string {
	return origin === "university" ? "University project" : "Personal project";
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
	return `<a href="${escapeHtml(repo)}">Repository</a>`;
}

export function projectEntry(project: Project): string {
	const url = siteUrl(`/projects/${project.slug}/`);
	const cover = cardCover(project.cover, project.coverAlt, project.slug);
	const description =
		project.description !== undefined
			? `<p class="entry-desc">${escapeHtml(project.description)}</p>`
			: "";
	return `<li><article class="card">${cover}<div class="card-body">
<h3 class="card-title"><a href="${url}">${escapeHtml(project.title)}</a></h3>
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
	return page({
		title: project.title,
		...(project.description === undefined
			? {}
			: { description: project.description }),
		styles: [siteUrl("/styles.css"), siteUrl("/prose.css")],
		content: `<div class="wrap"><article class="prose project">
<header class="project-header">
<p class="project-eyebrow">${originLabel(project.origin)}</p>
<h1>${escapeHtml(project.title)}</h1>
${lede}
</header>
<div class="project-grid">${side}<div class="project-main">${project.html}</div></div>
</article></div>`,
	});
}
