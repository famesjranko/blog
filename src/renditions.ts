/** One resized encoding pair of a source image, at an exact pixel size. */
export interface RenditionCandidate {
	width: number;
	height: number;
	avifSrc: string;
	webpSrc: string;
}

/** Every rendition the build generates, and the markup lists, for a source. */
export interface RenditionPlan {
	source: string;
	candidates: RenditionCandidate[];
}

/** `/a/b.jpg` -> `/a/b.<label>-<width>w.<extension>`. */
export function renditionSrc(
	src: string,
	label: string,
	width: number,
	extension: "avif" | "webp",
): string {
	return src.replace(/\.(jpe?g)$/i, `.${label}-${width}w.${extension}`);
}

interface SourceOptions {
	sizes: string;
	/** Maps a site path to the URL the page uses, e.g. with BASE_PATH. */
	url: (src: string) => string;
	escapeHtml: (value: string) => string;
}

function candidateSet(
	candidates: readonly RenditionCandidate[],
	format: "avif" | "webp",
	url: (src: string) => string,
): string {
	return candidates
		.map((candidate) => {
			const src = format === "avif" ? candidate.avifSrc : candidate.webpSrc;
			return `${url(src)} ${candidate.width}w`;
		})
		.join(", ");
}

/**
 * AVIF then WebP `<source>` elements for a `<picture>`. AVIF comes first
 * so browsers that decode it never fall through to the larger WebP.
 */
export function renditionSources(
	plan: RenditionPlan,
	options: SourceOptions,
): string {
	const { sizes, url, escapeHtml } = options;
	const avif = escapeHtml(candidateSet(plan.candidates, "avif", url));
	const webp = escapeHtml(candidateSet(plan.candidates, "webp", url));
	const escapedSizes = escapeHtml(sizes);
	return `<source type="image/avif" srcset="${avif}" sizes="${escapedSizes}"><source type="image/webp" srcset="${webp}" sizes="${escapedSizes}">`;
}
