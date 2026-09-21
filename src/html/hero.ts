import { siteUrl } from "../site.js";
import { type PageScript, escapeHtml } from "./layout.js";

export interface HeroAction {
	label: string;
	href: string;
}

export interface HeroCopy {
	eyebrow?: string;
	titleLines: string[];
	standfirst: string;
	actions?: HeroAction[];
	/** Stretch to the footer: for a page where the hero is the only content. */
	fill?: boolean;
}

/** Stylesheets and scripts a page must load for `hero()` to paint. */
export function heroAssets(): { styles: string[]; scripts: PageScript[] } {
	return {
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/hero.css"),
		],
		scripts: [{ src: siteUrl("/js/hero.js"), type: "module" }],
	};
}

function actionRow(actions: HeroAction[] = []): string {
	if (actions.length === 0) {
		return "";
	}
	const links = actions
		.map(
			(action) =>
				`<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`,
		)
		.join("");
	return `\n<p class="hero-cta">${links}</p>`;
}

/**
 * The site's dark hero: CSS wash fallback, WebGL thought field, then
 * the copy. hero.js finds it through `data-hero`; one per page.
 */
export function hero(copy: HeroCopy): string {
	const eyebrow =
		copy.eyebrow === undefined
			? ""
			: `<p class="hero-eyebrow">${escapeHtml(copy.eyebrow)}</p>\n`;
	const title = copy.titleLines.map((line) => escapeHtml(line)).join("<br>");
	const className = copy.fill === true ? "hero hero-fill" : "hero";
	return `<section class="${className}" data-hero>
<div class="hero-visual" aria-hidden="true"><span></span><span></span><span></span></div>
<canvas class="hero-canvas" data-thought-field aria-hidden="true"></canvas>
<div class="wrap hero-inner">
${eyebrow}<h1>${title}</h1>
<p class="hero-standfirst">${escapeHtml(copy.standfirst)}</p>${actionRow(copy.actions)}
</div>
</section>`;
}
