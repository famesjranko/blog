import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page } from "./layout.js";

export function essayIndexPage(essays: Essay[]): string {
	const items = essays
		.map(
			(e) =>
				`<li><a href="${siteUrl(`/essays/${e.slug}/`)}">${escapeHtml(e.title)}</a></li>`,
		)
		.join("\n");
	return page({
		title: "Essays",
		content: `<h1>Essays</h1><ul>${items}</ul>`,
	});
}

export function homePage(essays: Essay[]): string {
	return page({
		title: "Home",
		content: `<h1>Philosophy</h1><p>${essays.length} essays.</p><p><a href="${siteUrl("/essays/")}">Read essays</a></p>`,
	});
}
