import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page } from "./layout.js";

export function topicPage(topic: string, essays: Essay[]): string {
	const items = essays
		.filter((e) => e.topics.includes(topic))
		.map(
			(e) =>
				`<li><a href="${siteUrl(`/essays/${e.slug}/`)}">${escapeHtml(e.title)}</a></li>`,
		)
		.join("\n");
	return page({
		title: `Topic: ${topic}`,
		content: `<h1>${escapeHtml(topic)}</h1><ul>${items}</ul>`,
	});
}

export function allTopics(essays: Essay[]): string[] {
	return [...new Set(essays.flatMap((e) => e.topics))].sort();
}
