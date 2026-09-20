import path from "node:path";

/**
 * Which placeholder files a content set needs. Pure path bookkeeping;
 * the image script does the disk and sharp work around it.
 */
export const PLACEHOLDER_DIR = "static/img/placeholders";

export interface Piece {
	slug: string;
	cover?: string | undefined;
}

/** `static/img/placeholders/<slug>.jpg` for a slug. */
export function placeholderFile(slug: string): string {
	return path.join(PLACEHOLDER_DIR, `${slug}.jpg`);
}

/** Slugs needing a placeholder, sorted and de-duplicated. */
export function coverlessSlugs(pieces: readonly Piece[]): string[] {
	const slugs = pieces
		.filter((piece) => piece.cover === undefined)
		.map((piece) => piece.slug);
	return [...new Set(slugs)].sort();
}

/** Placeholder files on disk that no coverless piece needs. */
export function stalePlaceholders(
	present: readonly string[],
	needed: readonly string[],
): string[] {
	const wanted = new Set(needed.map(placeholderFile));
	return present.filter((file) => !wanted.has(file)).sort();
}
