import type { Page } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page as layout } from "./layout.js";

/**
 * A standalone page: essay prose plus the catalogue, figure and diagram
 * styles, with an optional eyebrow where an article shows its date.
 */
export function standalonePage(page: Page): string {
	const eyebrow =
		page.eyebrow === undefined
			? ""
			: `<p class="article-meta">${escapeHtml(page.eyebrow)}</p>\n`;
	return layout({
		title: page.title,
		canonicalPath: `/${page.slug}/`,
		...(page.description === undefined
			? {}
			: { description: page.description }),
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/prose.css"),
			siteUrl("/css/figures.css"),
			siteUrl("/css/essay.css"),
			siteUrl("/css/standalone.css"),
			siteUrl("/css/diagrams.css"),
			siteUrl("/css/lightbox.css"),
		],
		scripts: [siteUrl("/js/lightbox.js")],
		content: `<div class="wrap"><article class="prose essay standalone">
<header>
${eyebrow}<h1>${escapeHtml(page.title)}</h1>
</header>
${page.html}
</article></div>`,
	});
}
