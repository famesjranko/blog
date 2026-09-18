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
		`<nav class="desktop-nav" aria-label="Primary"><a href="${siteUrl("/essays/")}">Essays</a></nav>` +
		`<button class="menu-toggle" type="button" popovertarget="mobile-nav" aria-label="Open navigation">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>` +
		`</button>` +
		`<nav id="mobile-nav" popover aria-label="Mobile"><a href="${siteUrl("/essays/")}">Essays</a></nav></div></header>`
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
	styles = [siteUrl("/styles.css")],
}: {
	title: string;
	content: string;
	description?: string;
	scripts?: string[];
	styles?: string[];
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
}${styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">\n`).join("")}${scripts
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
