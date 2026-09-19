import { siteUrl } from "../site.js";

export const SITE_NAME = "Andrew J. McDonald";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

export function formatDate(date: Date): string {
	const month = MONTHS[date.getUTCMonth()] ?? "???";
	return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/**
 * Deterministic placeholder artwork values for imageless cards.
 * Same seed always yields the same hue/offset; unitless numbers only,
 * safe for inline style attributes. Units are applied in CSS, where
 * the offset doubles as gradient angle and motif position.
 */
export function placeholderStyle(seed: string): string {
	const hash = hashSeed(seed);
	const hue = hash % 360;
	const offset = (Math.floor(hash / 360) % 80) + 10;
	return `--placeholder-hue: ${hue}; --placeholder-offset: ${offset};`;
}

export function header(): string {
	return (
		`<header class="site-header"><div class="wrap header-inner">` +
		`<a class="site-name" href="${siteUrl("/")}">${escapeHtml(SITE_NAME)}</a>` +
		`<nav class="desktop-nav" aria-label="Primary"><a href="${siteUrl("/essays/")}">Essays</a><a href="${siteUrl("/projects/")}">Projects</a></nav>` +
		`<button class="menu-toggle" type="button" popovertarget="mobile-nav" aria-label="Open navigation">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>` +
		`</button>` +
		`<nav id="mobile-nav" popover aria-label="Mobile"><a href="${siteUrl("/essays/")}">Essays</a><a href="${siteUrl("/projects/")}">Projects</a></nav></div></header>`
	);
}

export function footer(): string {
	const year = new Date().getFullYear();
	return (
		`<footer class="site-footer"><div class="wrap">` +
		`<p>${escapeHtml(SITE_NAME)} &middot; &copy; ${year}</p></div></footer>`
	);
}

export interface PageScript {
	src: string;
	type: "classic" | "module";
}

function renderScript(script: string | PageScript): string {
	const src = typeof script === "string" ? script : script.src;
	const moduleScript = typeof script !== "string" && script.type === "module";
	const tag = moduleScript
		? `<script type="module" src="${escapeHtml(src)}"></script>\n`
		: `<script src="${escapeHtml(src)}" defer></script>\n`;
	return tag;
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
	scripts?: Array<string | PageScript>;
	styles?: string[];
}): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/svg+xml" href="${siteUrl("/favicon.svg")}">
<title>${escapeHtml(title)}</title>
${
	description !== undefined
		? `<meta name="description" content="${escapeHtml(description)}">
`
		: ""
}${styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">\n`).join("")}${scripts.map(renderScript).join("")}</head>
<body>
${header()}
<main>${content}</main>
${footer()}
</body>
</html>
`;
}
