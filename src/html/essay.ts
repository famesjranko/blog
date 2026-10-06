import { type Essay, writingPath } from "../content.js";
import { siteUrl } from "../site.js";
import { articleMeta } from "./articleMeta.js";
import { coverSrc, escapeHtml, page } from "./layout.js";

export function essayPage(essay: Essay): string {
	const subtitle =
		essay.description !== undefined
			? `<p>${escapeHtml(essay.description)}</p>`
			: "";
	const isNote = essay.section === "notes";
	const meta = articleMeta({
		label: isNote ? "Note" : "Essay",
		date: essay.date,
		readingMinutes: essay.readingMinutes,
		draft: essay.draft,
	});
	return page({
		title: essay.title,
		canonicalPath: writingPath(essay),
		socialImage: coverSrc(essay),
		...(essay.cover === undefined || essay.coverAlt === undefined
			? {}
			: { socialImageAlt: essay.coverAlt }),
		socialType: "article",
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
			...(isNote ? [siteUrl("/css/notes.css")] : []),
			siteUrl("/css/lightbox.css"),
		],
		scripts: [siteUrl("/js/lightbox.js")],
		content: `<div class="wrap"><article class="prose essay${isNote ? " note" : ""}">
<header>
${meta}
<h1>${escapeHtml(essay.title)}</h1>
${subtitle}
</header>
${essay.html}
</article></div>`,
	});
}
