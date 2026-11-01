import { imageSize, isInternalJpeg, type ImageSize } from "./images.js";
import { type RenditionPlan, renditionSrc } from "./renditions.js";

const ARTICLE_WIDTHS = [480, 720, 960, 1280];

/**
 * Rendered width of a body image: the `.wrap` column
 * (`100% - 2 * clamp(1rem, 4vw, 2.5rem)`) until `--prose-width` caps it.
 * That cap is `65ch` of the reading font: "Georgia Installed", then the
 * self-hosted Gelasio, then the generic serif. Georgia gives a column of
 * about 739px and Gelasio 715px. Noto Serif (674px) and DejaVu Serif
 * (767px) apply only if the webfont fails to load. `sizes` cannot follow
 * the font (`ch` here resolves against the initial font), so the cap is
 * 48rem, the smallest rem bound at or above the widest of these columns.
 * Both scale with the user's font size. Underestimating would serve a
 * blurry image, so the bound must not drop below the widest serif.
 * The 92vw slot is the exact `.wrap` width from 25rem to 62.5rem, and it
 * stays below 48rem until 52.2rem, where the cap takes over.
 */
export const ARTICLE_IMAGE_SIZES =
	"(min-width: 52.2rem) 48rem, (min-width: 25rem) 92vw, calc(100vw - 2rem)";

/**
 * Widths a source can provide without upscaling: the ladder widths
 * below the source width, plus the source width itself.
 */
export function articleCandidateWidths(size: ImageSize): number[] {
	return [
		...new Set([
			...ARTICLE_WIDTHS.filter((width) => width <= size.width),
			size.width,
		]),
	].sort((a, b) => a - b);
}

/** Aspect-preserving renditions of an internal JPEG used in an article body. */
export function articleImagePlan(src: string): RenditionPlan | undefined {
	if (!isInternalJpeg(src)) {
		return undefined;
	}
	const size = imageSize(src);
	if (size === undefined) {
		return undefined;
	}
	const candidates = articleCandidateWidths(size).map((width) => ({
		width,
		height: Math.round((width * size.height) / size.width),
		avifSrc: renditionSrc(src, "body", width, "avif"),
		webpSrc: renditionSrc(src, "body", width, "webp"),
	}));
	return { source: src, candidates };
}

/** Resolve and deduplicate the plans for every article-body image source. */
export function articleImagePlans(sources: readonly string[]): RenditionPlan[] {
	return [...new Set(sources)]
		.map(articleImagePlan)
		.filter((plan): plan is RenditionPlan => plan !== undefined);
}
