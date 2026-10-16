import { topicSlug } from "../content.js";
import { imageSize } from "../images.js";
import { canonicalSiteUrl, siteUrl } from "../site.js";

export const SITE_NAME = "Andrew J. McDonald";

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function topicLink(topic: string): string {
	return `<a href="${siteUrl(`/topics/${topicSlug(topic)}/`)}">${escapeHtml(topic)}</a>`;
}

function navLinks(): string {
	return (
		`<a href="${siteUrl("/essays/")}">Essays</a>` +
		`<a href="${siteUrl("/projects/")}">Projects</a>` +
		`<a href="${siteUrl("/ai-engineering/")}">AI Engineering</a>` +
		`<a href="${siteUrl("/notes/")}">Notes</a>`
	);
}

export function header(): string {
	const links = navLinks();
	return (
		`<header class="site-header"><div class="wrap header-inner">` +
		`<a class="site-name" href="${siteUrl("/")}">${escapeHtml(SITE_NAME)}</a>` +
		`<div class="header-actions">` +
		`<nav class="desktop-nav" aria-label="Primary">${links}</nav>` +
		`<button class="theme-toggle" type="button" data-theme-toggle aria-label="Dark theme">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/></svg>` +
		`</button>` +
		`<button class="menu-toggle" type="button" popovertarget="mobile-nav" aria-label="Open navigation">` +
		`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>` +
		`</button>` +
		`<nav id="mobile-nav" popover aria-label="Mobile">${links}</nav></div></div></header>`
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

interface PageOptions {
	title: string;
	content: string;
	description?: string;
	canonicalPath?: string;
	socialImage?: string;
	socialImageAlt?: string;
	socialType?: "article" | "website";
	scripts?: Array<string | PageScript>;
	styles?: string[];
	skipTo?: string;
}

interface SocialMetadataOptions {
	title: string;
	description: string | undefined;
	canonicalPath: string | undefined;
	socialImage: string | undefined;
	socialImageAlt: string | undefined;
	socialType: "article" | "website" | undefined;
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
 * without it the page would flash the OS scheme, then switch. It also
 * gives the browser a color-scheme meta for that choice; the browser
 * paints the frames before main.css arrives from the first such meta.
 * Chromium ignores later edits to it for those frames, so the script
 * inserts its own ahead of the page's static "light dark" one.
 */
const THEME_BOOT_SCRIPT =
	'<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.createElement("meta");m.name="color-scheme";m.content=t;document.head.appendChild(m)}}catch(e){}</script>';

/**
 * Share card for a page without its own image: a still of the homepage
 * hero. Without it, link previews fall back to the small favicon.
 */
const DEFAULT_SOCIAL_IMAGE = "/img/share.jpg";
const DEFAULT_SOCIAL_IMAGE_ALT =
	"From philosophy to software: essays, projects, and notes by Andrew J. McDonald";

/**
 * Image tags for link previews. The size lets a scraper lay out the card
 * on the first share, before it has fetched the image.
 */
function socialImageTags(src: string, alt: string | undefined): string {
	const url = escapeHtml(src.startsWith("/") ? canonicalSiteUrl(src) : src);
	const size = imageSize(src);
	const dimensions =
		size === undefined
			? ""
			: `<meta property="og:image:width" content="${size.width}">\n<meta property="og:image:height" content="${size.height}">\n`;
	const altTags =
		alt === undefined
			? ""
			: `<meta property="og:image:alt" content="${escapeHtml(alt)}">\n<meta name="twitter:image:alt" content="${escapeHtml(alt)}">\n`;
	return `<meta property="og:image" content="${url}">\n<meta name="twitter:image" content="${url}">\n${dimensions}${altTags}`;
}

function socialMetadata(options: SocialMetadataOptions): string {
	if (options.canonicalPath === undefined) {
		return "";
	}
	const url = canonicalSiteUrl(options.canonicalPath);
	const description =
		options.description === undefined
			? ""
			: `<meta property="og:description" content="${escapeHtml(options.description)}">\n<meta name="twitter:description" content="${escapeHtml(options.description)}">\n`;
	const image =
		options.socialImage === undefined
			? socialImageTags(DEFAULT_SOCIAL_IMAGE, DEFAULT_SOCIAL_IMAGE_ALT)
			: socialImageTags(options.socialImage, options.socialImageAlt);
	return `<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:type" content="${options.socialType ?? "website"}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:title" content="${escapeHtml(options.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(options.title)}">
${description}${image}`;
}

/**
 * `skipTo` is the id the skip link jumps to. It defaults to main, and
 * a page whose main opens with decoration (the homepage hero) passes
 * the id of its first real content section instead.
 */
export function page({
	title,
	content,
	description,
	canonicalPath,
	socialImage,
	socialImageAlt,
	socialType,
	scripts = [],
	styles = [siteUrl("/css/main.css"), siteUrl("/css/header.css")],
	skipTo = "main",
}: PageOptions): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
${THEME_BOOT_SCRIPT}
<meta name="color-scheme" content="light dark">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" sizes="32x32" href="${siteUrl("/favicon-32.png")}">
<link rel="icon" type="image/png" sizes="192x192" href="${siteUrl("/favicon-192.png")}">
<link rel="icon" type="image/svg+xml" href="${siteUrl("/favicon.svg")}">
<link rel="apple-touch-icon" sizes="180x180" href="${siteUrl("/apple-touch-icon.png")}">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)}" href="${siteUrl("/rss.xml")}">
<title>${escapeHtml(title)}</title>
${
	description !== undefined
		? `<meta name="description" content="${escapeHtml(description)}">
`
		: ""
}${socialMetadata({ title, description, canonicalPath, socialImage, socialImageAlt, socialType })}<link rel="stylesheet" href="${siteUrl("/css/fonts.css")}">
${styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">\n`).join("")}${renderScript(siteUrl("/js/theme.js"))}${renderScript(siteUrl("/js/mobile-nav.js"))}${scripts.map(renderScript).join("")}</head>
<body>
<a class="skip-link" href="#${escapeHtml(skipTo)}">Skip to content</a>
${header()}
<main id="main">${content}</main>
${footer()}
</body>
</html>
`;
}
