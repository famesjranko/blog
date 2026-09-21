import { siteUrl } from "../site.js";
import { hero, heroAssets } from "./hero.js";
import { page } from "./layout.js";

interface ErrorCopy {
	title: string;
	headline: string[];
	standfirst: string;
}

// Keys define the supported statuses. Do not annotate this as
// `Record<number, ErrorCopy>`: that widens ErrorStatus to number.
const ERROR_COPY = {
	404: {
		title: "Page not found",
		headline: ["Nothing lives", "at this address"],
		standfirst: "The page may have moved, or the link was never right.",
	},
	500: {
		title: "Something broke",
		headline: ["The server", "lost its thread"],
		standfirst: "Not your doing. Try again in a moment.",
	},
	503: {
		title: "Back shortly",
		headline: ["Away for", "a moment"],
		standfirst: "The site is briefly unavailable. It will be back.",
	},
} satisfies Record<number, ErrorCopy>;

export type ErrorStatus = keyof typeof ERROR_COPY;

/**
 * One error page per HTTP status, rendered as a hero so it matches the
 * homepage. Which statuses get written is the build's decision, not this
 * module's: GitHub Pages only serves 404.html.
 */
export function errorPage(status: ErrorStatus): string {
	const copy = ERROR_COPY[status];
	return page({
		title: `${status} — ${copy.title}`,
		description: copy.standfirst,
		...heroAssets(),
		content: hero({
			eyebrow: String(status),
			titleLines: copy.headline,
			standfirst: copy.standfirst,
			fill: true,
			actions: [
				{ label: "Home", href: siteUrl("/") },
				{ label: "Essays", href: siteUrl("/essays/") },
				{ label: "Projects", href: siteUrl("/projects/") },
			],
		}),
	});
}
