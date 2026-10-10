import { articleImagePlan } from "../articleImages.js";
import type { Essay, Project } from "../content.js";
import {
	type HomeEntry,
	type HomeSection,
	homeEntries,
	selectHome,
} from "../home.js";
import { siteUrl } from "../site.js";
import { hero, heroAssets } from "./hero.js";
import { coverPicture, escapeHtml, page } from "./layout.js";

// Homepage hero copy. Edit freely; no logic depends on it.
// Non-breaking spaces keep each phrase whole and the separator on the
// phrase before it, so a narrow screen wraps only after a separator.
const HERO_EYEBROW = ["BACKEND & SYSTEMS ENGINEER", "MELBOURNE"]
	.map((phrase) => phrase.replaceAll(" ", " "))
	.join(" · ");
const HERO_TITLE_LINES = ["From philosophy", "to software"];
const HERO_STANDFIRST = "A personal collection of essays, projects, and notes.";

const SECTION_NAMES: Record<HomeSection, string> = {
	essays: "Essays",
	projects: "Projects",
	notes: "Notes",
};

const SECTION_ITEM_NAMES: Record<HomeSection, string> = {
	essays: "Essay",
	projects: "Project",
	notes: "Note",
};

/** The showcase spans the `.wrap` column, 68rem at most. */
const SHOWCASE_IMAGE_SIZES =
	"(min-width: 73rem) 68rem, (min-width: 62.5rem) calc(100vw - 5rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";

/**
 * A 6rem thumbnail beside the text until 52rem, then a quarter of the
 * `.wrap` column less its three 1.5rem gaps.
 */
const PICK_IMAGE_SIZES =
	"(min-width: 73rem) 15.9rem, (min-width: 62.5rem) calc(25vw - 2.4rem), (min-width: 52rem) calc(23vw - 1.1rem), 6rem";

// Fixed abbreviations: Intl's short months vary by locale and ICU version.
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

/** "20 Jul 2016", read in UTC like the content dates. */
function displayDate(date: Date): string {
	return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function titleLink(entry: HomeEntry): string {
	return `<a href="${siteUrl(entry.path)}">${escapeHtml(entry.title)}</a>`;
}

function sectionLabel(entry: HomeEntry): string {
	return `<p class="home-label">${SECTION_NAMES[entry.section]}</p>`;
}

/**
 * The cover at its own proportions, from aspect-preserving renditions,
 * so the banner shows the whole image rather than the card crop.
 */
function showcaseBlock(entry: HomeEntry): string {
	const description =
		entry.description === undefined
			? ""
			: `<p class="showcase-desc">${escapeHtml(entry.description)}</p>`;
	const art = coverPicture(entry, SHOWCASE_IMAGE_SIZES, articleImagePlan);
	return `<article class="showcase">
<div class="showcase-media">${art}</div>
${sectionLabel(entry)}
<h3 class="showcase-title">${titleLink(entry)}</h3>
${description}
</article>`;
}

function pickItem(entry: HomeEntry): string {
	const description =
		entry.description === undefined
			? ""
			: `<p class="home-pick-desc">${escapeHtml(entry.description)}</p>`;
	return `<li class="home-pick">
<div class="home-pick-media">${coverPicture(entry, PICK_IMAGE_SIZES)}</div>
<div class="home-pick-text">${sectionLabel(entry)}<h3 class="home-pick-title">${titleLink(entry)}</h3>${description}</div>
</li>`;
}

function featuredSection(showcase: HomeEntry, picks: HomeEntry[]): string {
	const row =
		picks.length === 0
			? ""
			: `\n<ol class="home-picks">${picks.map(pickItem).join("\n")}</ol>`;
	return `<section id="featured" class="wrap recent" aria-labelledby="featured-heading">
<h2 id="featured-heading">Featured</h2>
${showcaseBlock(showcase)}${row}
</section>`;
}

function latestItem(entry: HomeEntry): string {
	const iso = entry.date.toISOString().slice(0, 10);
	return `<li class="latest-item"><time datetime="${iso}">${displayDate(entry.date)}</time><span class="latest-section">${SECTION_ITEM_NAMES[entry.section]}</span>${titleLink(entry)}</li>`;
}

function latestSection(latest: HomeEntry[]): string {
	if (latest.length === 0) {
		return "";
	}
	return `<section id="latest" class="wrap recent" aria-labelledby="latest-heading">
<h2 id="latest-heading">Latest</h2>
<ol class="latest-list">${latest.map(latestItem).join("\n")}</ol>
</section>`;
}

export function homePage(content: {
	essays: Essay[];
	notes: Essay[];
	projects: Project[];
}): string {
	const { showcase, picks, latest } = selectHome(homeEntries(content));
	const sections =
		showcase === undefined
			? ""
			: featuredSection(showcase, picks) + latestSection(latest);
	const assets = heroAssets();
	return page({
		title: "Andrew J. McDonald",
		canonicalPath: "/",
		description: HERO_STANDFIRST,
		// The hero is decoration, so the skip link lands on the first real section.
		skipTo: showcase === undefined ? "main" : "featured",
		scripts: assets.scripts,
		styles: [...assets.styles, siteUrl("/css/home.css")],
		content: `${hero({
			eyebrow: HERO_EYEBROW,
			titleLines: HERO_TITLE_LINES,
			standfirst: HERO_STANDFIRST,
		})}
${sections}`,
	});
}
