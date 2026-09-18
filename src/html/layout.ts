import { siteUrl } from "../site.js";

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function header(): string {
	return `<header><nav><a href="${siteUrl("/")}">Home</a> <a href="${siteUrl("/essays/")}">Essays</a></nav></header>`;
}

export function footer(): string {
	return `<footer><p>Hand-built with TypeScript. No framework.</p></footer>`;
}

export function page({
	title,
	content,
}: {
	title: string;
	content: string;
}): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${siteUrl("/styles.css")}">
</head>
<body>
${header()}
<main>${content}</main>
${footer()}
</body>
</html>
`;
}
