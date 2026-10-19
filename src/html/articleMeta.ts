import { escapeHtml, topicLink } from "./layout.js";

interface ArticleMetaOptions {
	label: string;
	date: Date;
	readingMinutes: number;
	draft: boolean;
}

/** Shared type, year, and reading-time line for every article header. */
export function articleMeta({
	label,
	date,
	readingMinutes,
	draft,
}: ArticleMetaOptions): string {
	const isoDate = date.toISOString().slice(0, 10);
	const year = date.getUTCFullYear();
	const draftLabel = draft ? '<span class="draft-eyebrow">Draft</span>' : "";
	return `<p class="article-meta">${draftLabel}${escapeHtml(label)} <span aria-hidden="true">·</span> <time datetime="${isoDate}">${year}</time> <span aria-hidden="true">·</span> ${readingMinutes} min read</p>`;
}

/** Topic pills that close an article; empty when the piece has no topics. */
export function articleTopics(topics: string[]): string {
	if (topics.length === 0) {
		return "";
	}
	const links = topics.map((topic) => topicLink(topic)).join("");
	return `<footer class="article-topics"><p class="article-topics-label">Topics</p><p class="entry-topics">${links}</p></footer>`;
}
