import { type Essay, topicSlug } from "../content.js";
import { escapeHtml, page } from "./layout.js";
import { essayEntry } from "./index.js";

export interface TopicEntry {
	name: string;
	slug: string;
}

export function topicPage(topic: TopicEntry, essays: Essay[]): string {
	const items = essays
		.filter((e) => e.topics.some((t) => topicSlug(t) === topic.slug))
		.map((e) => essayEntry(e))
		.join("\n");
	return page({
		title: `Topic: ${topic.name}`,
		content: `<div class="wrap topic-page"><h1>${escapeHtml(topic.name)}</h1><ol class="essay-list">${items}</ol></div>`,
	});
}

/**
 * Deduplicated topics with URL slugs. Throws when distinct names
 * collapse to one slug so the build fails instead of overwriting pages.
 */
export function allTopics(essays: Essay[]): TopicEntry[] {
	const names = [...new Set(essays.flatMap((e) => e.topics))];
	const seen = new Map<string, string>();
	for (const name of names) {
		const slug = topicSlug(name);
		const first = seen.get(slug);
		if (first !== undefined && first !== name) {
			throw new Error(
				`topics ${JSON.stringify(first)} and ${JSON.stringify(name)} share slug ${JSON.stringify(slug)}`,
			);
		}
		seen.set(slug, name);
	}
	return [...seen.entries()]
		.map(([slug, name]) => ({ name, slug }))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}
