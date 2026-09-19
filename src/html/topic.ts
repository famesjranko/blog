import type { Essay } from "../content.js";
import { escapeHtml, page } from "./layout.js";
import { essayEntry } from "./index.js";

export function topicPage(topic: string, essays: Essay[]): string {
	const items = essays
		.filter((e) => e.topics.includes(topic))
		.map((e) => essayEntry(e))
		.join("\n");
	return page({
		title: `Topic: ${topic}`,
		content: `<div class="wrap topic-page"><h1>${escapeHtml(topic)}</h1><ol class="essay-list">${items}</ol></div>`,
	});
}

export function allTopics(essays: Essay[]): string[] {
	return [...new Set(essays.flatMap((e) => e.topics))].sort();
}
