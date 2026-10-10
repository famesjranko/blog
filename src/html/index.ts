import { type Essay, writingPath } from "../content.js";
import { siteUrl } from "../site.js";
import { cardClass, cardCover, escapeHtml, page, topicLink } from "./layout.js";
import { titleHtml } from "./titleText.js";

export function essayEntry(essay: Essay): string {
	const url = siteUrl(writingPath(essay));
	const cover = cardCover(essay);
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics = `<span class="entry-topics">${essay.topics.map((topic) => topicLink(topic)).join("")}</span>`;
	return `<li><article class="${cardClass(essay)}">
${cover}<div class="card-body">
<h2 class="card-title"><a href="${url}">${titleHtml(essay.title)}</a></h2>
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
