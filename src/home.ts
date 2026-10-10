import {
	type Essay,
	type Project,
	pickFeatured,
	writingPath,
} from "./content.js";

/** Homepage sections in display order. */
export type HomeSection = "essays" | "projects" | "notes";

export const HOME_SECTIONS: readonly HomeSection[] = [
	"essays",
	"projects",
	"notes",
];

/** One piece from any section, reduced to what the homepage shows. */
export interface HomeEntry {
	section: HomeSection;
	path: string;
	slug: string;
	title: string;
	description?: string | undefined;
	date: Date;
	cover?: string | undefined;
	coverAlt?: string | undefined;
	featured: boolean;
	showcase: boolean;
	draft: boolean;
}

export interface HomeSelection {
	showcase?: HomeEntry | undefined;
	/** Up to PICK_COUNT pieces: one per section, then backfill. */
	picks: HomeEntry[];
	latest: HomeEntry[];
}

/** The pick row always has this many slots when there is enough content. */
export const PICK_COUNT = 4;

export const LATEST_COUNT = 6;

/**
 * Whether Latest leaves out what Featured already shows. Off makes
 * Latest the strictly newest pieces, repeats included.
 */
export const LATEST_SKIPS_FEATURED = true;

function entry(piece: Essay | Project, section: HomeSection, path: string) {
	return {
		section,
		path,
		slug: piece.slug,
		title: piece.title,
		description: piece.description,
		date: piece.date,
		cover: piece.cover,
		coverAlt: piece.coverAlt,
		featured: piece.featured,
		showcase: piece.showcase,
		draft: piece.draft,
	};
}

export function homeEntries(content: {
	essays: Essay[];
	notes: Essay[];
	projects: Project[];
}): HomeEntry[] {
	return [
		...content.essays.map((e) => entry(e, "essays", writingPath(e))),
		...content.projects.map((p) =>
			entry(p, "projects", `/projects/${p.slug}/`),
		),
		...content.notes.map((n) => entry(n, "notes", writingPath(n))),
	];
}

/**
 * The one piece flagged `showcase: true`, else the newest featured piece,
 * else the newest piece. Two flags are a content error, not a tie to
 * break silently.
 */
export function pickShowcase(entries: HomeEntry[]): HomeEntry | undefined {
	const flagged = entries.filter((e) => e.showcase);
	if (flagged.length > 1) {
		const titles = flagged.map((e) => JSON.stringify(e.title)).join(", ");
		throw new Error(`only one piece may set showcase: true; found ${titles}`);
	}
	return flagged[0] ?? pickFeatured(entries, 1)[0];
}

/**
 * One pick per section in section order, the showcase excluded. A section
 * with nothing left leaves a slot that the other sections fill, by the
 * same featured-then-newest rule, so the row keeps all its slots.
 */
function selectPicks(entries: HomeEntry[], showcase?: HomeEntry): HomeEntry[] {
	const pool = entries.filter((e) => e !== showcase);
	const perSection = HOME_SECTIONS.flatMap((s) =>
		pickFeatured(
			pool.filter((e) => e.section === s),
			1,
		),
	).slice(0, PICK_COUNT);
	const rest = pool.filter((e) => !perSection.includes(e));
	return [...perSection, ...pickFeatured(rest, PICK_COUNT - perSection.length)];
}

export function selectHome(
	entries: HomeEntry[],
	skipFeatured: boolean = LATEST_SKIPS_FEATURED,
): HomeSelection {
	const showcase = pickShowcase(entries);
	const picks = selectPicks(entries, showcase);
	const shown = new Set([showcase, ...picks]);
	const latest = entries
		.filter((e) => !(skipFeatured && shown.has(e)))
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, LATEST_COUNT);
	return { showcase, picks, latest };
}
