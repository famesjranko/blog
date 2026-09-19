import { type Essay, topicSlug } from "../content.js";
import { siteUrl } from "../site.js";
import { escapeHtml, page } from "./layout.js";

// Provisional homepage copy. Edit freely; no logic depends on it.
const HERO_TITLE = "Philosophy, technology, and the human condition.";
const HERO_STANDFIRST =
	"Essays and notes on ethics, phenomenology, technology, software, and related questions.";

const RECENT_COUNT = 5;

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

export function topicLink(topic: string): string {
	return `<a href="${siteUrl(`/topics/${topicSlug(topic)}/`)}">${escapeHtml(topic)}</a>`;
}

export interface Cover {
	src: string;
	alt: string;
}

export function extractCover(html: string): Cover | undefined {
	const tag = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(html)?.[0];
	if (tag === undefined) {
		return undefined;
	}
	const src = /src="([^"]*)"/i.exec(tag)?.[1];
	if (src === undefined || src === "") {
		return undefined;
	}
	const alt = /alt="([^"]*)"/i.exec(tag)?.[1] ?? "";
	return { src, alt };
}

function essayCover(essay: Essay): string {
	const cover = extractCover(essay.html);
	if (cover === undefined) {
		return "";
	}
	return `<div class="card-media"><img src="${escapeHtml(cover.src)}" alt="${escapeHtml(cover.alt)}" loading="lazy" decoding="async"></div>`;
}

export function essayEntry(essay: Essay): string {
	const url = siteUrl(`/essays/${essay.slug}/`);
	const cover = essayCover(essay);
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics =
		essay.topics.length > 0
			? `<span class="entry-topics">${essay.topics.map((topic) => topicLink(topic)).join("")}</span>`
			: "";
	return `<li><article class="card">
${cover}<div class="card-body">
<h3 class="card-title"><a href="${url}">${escapeHtml(essay.title)}</a></h3>
${description}
<p class="entry-meta">${topics}<time datetime="${essay.date.toISOString()}">${formatDate(essay.date)}</time></p>
</div></article></li>`;
}

export function essayIndexPage(essays: Essay[]): string {
	const entries = essays.map((essay) => essayEntry(essay)).join("\n");
	const count = essays.length === 1 ? "1 essay" : `${essays.length} essays`;
	return page({
		title: "Essays",
		content: `<div class="wrap essays-page"><h1>Essays</h1><p class="essay-count">${count}</p><ol class="card-grid">${entries}</ol></div>`,
	});
}

export function homePage(essays: Essay[]): string {
	const recent = essays.slice(0, RECENT_COUNT);
	const entries = recent.map((essay) => essayEntry(essay)).join("\n");
	return page({
		title: "Andrew J. McDonald",
		description: HERO_STANDFIRST,
		scripts: [siteUrl("/hero.js")],
		styles: [siteUrl("/styles.css"), siteUrl("/hero.css")],
		content: `<section class="hero" data-hero>
<div class="hero-visual" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="wrap hero-inner">
<h1>${escapeHtml(HERO_TITLE)}</h1>
<p class="hero-standfirst">${escapeHtml(HERO_STANDFIRST)}</p>
<p class="hero-cta"><a href="${siteUrl("/essays/")}">Read essays</a></p>
</div>
</section>
<section class="wrap recent" aria-labelledby="recent-heading">
<h2 id="recent-heading">Recent essays</h2>
<ol class="card-grid">${entries}</ol>
</section>`,
	});
}
