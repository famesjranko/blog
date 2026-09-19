import type { Project } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, formatDate, page } from "./layout.js";

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

function repoLink(repo: string | undefined): string {
	if (repo === undefined) {
		return "";
	}
	return `<a href="${escapeHtml(repo)}">Repository</a>`;
}

export function projectEntry(project: Project): string {
	const url = siteUrl(`/projects/${project.slug}/`);
	const description =
		project.description !== undefined
			? `<p class="entry-desc">${escapeHtml(project.description)}</p>`
			: "";
	return `<li><article class="card"><div class="card-body">
<h3 class="card-title"><a href="${url}">${escapeHtml(project.title)}</a></h3>
${description}
<p class="entry-meta"><span class="project-origin">${originLabel(project.origin)}</span>${stackList(project.stack)}<time datetime="${project.date.toISOString()}">${formatDate(project.date)}</time></p>
</div></article></li>`;
}

export function projectIndexPage(projects: Project[]): string {
	const entries = projects.map((p) => projectEntry(p)).join("\n");
	const count =
		projects.length === 1 ? "1 project" : `${projects.length} projects`;
	return page({
		title: "Projects",
		content: `<div class="wrap projects-page"><h1>Projects</h1><p class="project-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
	});
}

export function projectPage(project: Project): string {
	const subtitle =
		project.description !== undefined
			? `<p>${escapeHtml(project.description)}</p>`
			: "";
	const predecessor =
		project.predecessor !== undefined
			? `<p class="project-predecessor">Extended from <a href="${siteUrl(`/projects/${project.predecessor}/`)}">${escapeHtml(project.predecessor)}</a>.</p>`
			: "";
	return page({
		title: project.title,
		styles: [siteUrl("/styles.css"), siteUrl("/prose.css")],
		content: `<div class="wrap"><article class="prose">
<header>
<h1>${escapeHtml(project.title)}</h1>
${subtitle}
<p class="project-meta"><span class="project-origin">${originLabel(project.origin)}</span>${stackList(project.stack)}${repoLink(project.repo)}</p>
<time datetime="${project.date.toISOString()}">${escapeHtml(project.date.toISOString().slice(0, 10))}</time>
${predecessor}
</header>
${project.html}
</article></div>`,
	});
}
