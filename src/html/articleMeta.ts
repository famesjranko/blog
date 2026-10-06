import { escapeHtml } from "./layout.js";

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
