import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page } from "./layout.js";

export function essayPage(essay: Essay): string {
	const subtitle =
		essay.description !== undefined
			? `<p>${escapeHtml(essay.description)}</p>`
			: "";
	return page({
		title: essay.title,
		...(essay.description === undefined
			? {}
			: { description: essay.description }),
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/prose.css"),
		],
		content: `<div class="wrap"><article class="prose">
<header>
<h1>${escapeHtml(essay.title)}</h1>
${subtitle}
</header>
${essay.html}
</article></div>`,
	});
}
