import { imageSize, isInternalJpeg, type ImageSize } from "./images.js";
import { type RenditionPlan, renditionSrc } from "./renditions.js";

const ARTICLE_WIDTHS = [480, 720, 960, 1280];

/**
 * Rendered width of a body image: the `.wrap` column
 * (`100% - 2 * clamp(1rem, 4vw, 2.5rem)`) until the prose measure caps it.
 * The cap is `65ch` of the reading font, but `ch` in `sizes` resolves
 * against the initial font, not the prose font. So the cap is written
 * as 38rem. That is just above the 603px measured with Georgia at the
 * largest prose size, so the estimate never undersizes the image.
 */
export const ARTICLE_IMAGE_SIZES =
	"(min-width: 40rem) 38rem, (min-width: 25rem) 92vw, calc(100vw - 2rem)";

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
