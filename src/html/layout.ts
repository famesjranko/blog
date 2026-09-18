import { siteUrl } from "../site.js";

export const SITE_NAME = "Andrew J. McDonald";

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function header(): string {
	return (
		`<header class="site-header"><div class="wrap header-inner">` +
		`<a class="site-name" href="${siteUrl("/")}">${escapeHtml(SITE_NAME)}</a>` +
		`<nav aria-label="Primary"><a href="${siteUrl("/essays/")}">Essays</a></nav></div></header>`
	);
}

export function footer(): string {
	const year = new Date().getFullYear();
	return (
		`<footer class="site-footer"><div class="wrap">` +
		`<p>${escapeHtml(SITE_NAME)} &middot; &copy; ${year}</p></div></footer>`
	);
}

export function page({
	title,
	content,
	description,
	scripts = [],
}: {
	title: string;
	content: string;
	description?: string;
	scripts?: string[];
}): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${
	description !== undefined
		? `<meta name="description" content="${escapeHtml(description)}">
`
		: ""
}<link rel="stylesheet" href="${siteUrl("/styles.css")}">
${scripts
	.map(
		(src) => `<script src="${escapeHtml(src)}" defer></script>
`,
	)
	.join("")}</head>
<body>
${header()}
<main>${content}</main>
${footer()}
</body>
</html>
`;
}
