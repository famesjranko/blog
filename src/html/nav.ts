import { siteUrl } from "../site.js";

/**
 * Standalone pages linked from the header. The build fails when a linked
 * page is missing (see routes.ts), so the navigation never dangles.
 */
export const NAV_PAGES = [
	{ slug: "agentic-engineering", label: "Agentic engineering" },
];

const SECTIONS = [
	{ path: "/essays/", label: "Essays" },
	{ path: "/projects/", label: "Projects" },
	{ path: "/notes/", label: "Notes" },
];

/**
 * The primary navigation, shared by the desktop and mobile menus. Labels
 * are code constants, so they need no escaping.
 */
export function navLinks(): string {
	const pages = NAV_PAGES.map(({ slug, label }) => ({
		path: `/${slug}/`,
		label,
	}));
	return [...SECTIONS, ...pages]
		.map(({ path, label }) => `<a href="${siteUrl(path)}">${label}</a>`)
		.join("");
}
