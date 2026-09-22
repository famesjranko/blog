import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page } from "./layout.js";

export function essayPage(essay: Essay): string {
	const subtitle =
		essay.description !== undefined
			? `<p>${escapeHtml(essay.description)}</p>`
			: "";
	const draft = essay.draft ? `<p class="draft-eyebrow">Draft</p>\n` : "";
	return page({
		title: essay.title,
		...(essay.description === undefined
			? {}
			: { description: essay.description }),
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/prose.css"),
			siteUrl("/css/figures.css"),
			siteUrl("/css/essay.css"),
			siteUrl("/css/essay-patterns.css"),
			siteUrl("/css/essay-discussion.css"),
			siteUrl("/css/diagrams.css"),
		],
		content: `<div class="wrap"><article class="prose essay">
<header>
${draft}<h1>${escapeHtml(essay.title)}</h1>
${subtitle}
</header>
${essay.html}
</article></div>`,
	});
}
