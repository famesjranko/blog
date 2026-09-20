import { imageSize, webpSrc } from "../images.js";
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

/**
 * Card cover: explicit image when set, deterministic placeholder otherwise.
 * Root-relative sources are prefixed with the site base path, mirroring
 * the markdown image rule, so covers keep working under BASE_PATH.
 * Internal JPEG covers render as `<picture>` with a WebP source; the
 * original file remains the fallback `<img>`. All other sources keep
 * the existing plain `<img>` rendering.
 */
export function cardCover(
	src: string | undefined,
	alt: string | undefined,
	slug: string,
): string {
	if (src === undefined) {
		return `<div class="card-media card-media--placeholder" style="${placeholderStyle(slug)}" aria-hidden="true"></div>`;
	}
	const url = src.startsWith("/") && !src.startsWith("//") ? siteUrl(src) : src;
	const size = imageSize(src);
	const dimensions =
		size === undefined ? "" : ` width="${size.width}" height="${size.height}"`;
	const img = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt ?? "")}"${dimensions} loading="lazy" decoding="async">`;
	const webp = webpSrc(src);
	if (webp === undefined) {
		return `<div class="card-media">${img}</div>`;
	}
	const webpUrl = siteUrl(webp);
	return `<div class="card-media"><picture><source type="image/webp" srcset="${escapeHtml(webpUrl)}">${img}</picture></div>`;
}

export function header(): string {
	return (
		`<header class="site-header"><div class="wrap header-inner">` +
		`<a class="site-name" href="${siteUrl("/")}">${escapeHtml(SITE_NAME)}</a>` +
		`<div class="header-actions">` +
		`<nav class="desktop-nav" aria-label="Primary"><a href="${siteUrl("/essays/")}">Essays</a><a href="${siteUrl("/projects/")}">Projects</a></nav>` +
		`<button class="theme-toggle" type="button" data-theme-toggle aria-label="Dark theme">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/></svg>` +
		`</button>` +
		`<button class="menu-toggle" type="button" popovertarget="mobile-nav" aria-label="Open navigation">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>` +
		`</button>` +
		`<nav id="mobile-nav" popover aria-label="Mobile"><a href="${siteUrl("/essays/")}">Essays</a><a href="${siteUrl("/projects/")}">Projects</a></nav></div></div></header>`
	);
}

const GITHUB_URL = "https://github.com/famesjranko";

// GitHub's mark, from the Octicons set, so the link is recognisable at a glance.
const GITHUB_ICON =
	'<svg class="footer-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>';

export function footer(): string {
	const year = new Date().getFullYear();
	return (
		`<footer class="site-footer"><div class="wrap footer-inner">` +
		`<p>${escapeHtml(SITE_NAME)} &middot; &copy; ${year}</p>` +
		`<p><a class="footer-link" href="${GITHUB_URL}" rel="me noopener" target="_blank">${GITHUB_ICON}GitHub</a></p>` +
		`</div></footer>`
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

/**
 * Runs before any stylesheet so a stored theme choice paints first;
 * without it the page would flash the OS scheme, then switch.
 */
const THEME_BOOT_SCRIPT =
	'<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}</script>';

export function page({
	title,
	content,
	description,
	scripts = [],
	styles = [siteUrl("/styles.css"), siteUrl("/header.css")],
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
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)}" href="${siteUrl("/rss.xml")}">
<title>${escapeHtml(title)}</title>
${
	description !== undefined
		? `<meta name="description" content="${escapeHtml(description)}">
`
		: ""
}${THEME_BOOT_SCRIPT}
${styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">\n`).join("")}${renderScript(siteUrl("/theme.js"))}${scripts.map(renderScript).join("")}</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header()}
<main id="main">${content}</main>
${footer()}
</body>
</html>
`;
}
