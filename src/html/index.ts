import type { Essay } from "../content.js";
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

function essayEntry(essay: Essay): string {
	const description =
		essay.description !== undefined
			? `<p class="entry-desc">${escapeHtml(essay.description)}</p>`
			: "";
	const topics =
		essay.topics.length > 0
			? `<span class="entry-topics">${essay.topics.map((topic) => escapeHtml(topic)).join(" · ")}</span>`
			: "";
	return `<li><article class="entry">
<h3><a href="${siteUrl(`/essays/${essay.slug}/`)}">${escapeHtml(essay.title)}</a></h3>
${description}
<p class="entry-meta">${topics}<time datetime="${essay.date.toISOString()}">${formatDate(essay.date)}</time></p>
</article></li>`;
}

export function essayIndexPage(essays: Essay[]): string {
	const entries = essays.map((essay) => essayEntry(essay)).join("\n");
	return page({
		title: "Essays",
		content: `<div class="wrap"><h1>Essays</h1><ol class="essay-list">${entries}</ol></div>`,
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
<ol class="essay-list">${entries}</ol>
</section>`,
	});
}
