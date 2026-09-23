import type { Essay, Project } from "./content.js";
import { imageSize, isInternalJpeg, type ImageSize } from "./images.js";

const CARD_WIDTHS = [480, 720, 1088, 1440];
const RATIO_WIDTH = 16;
const RATIO_HEIGHT = 9;

export const CARD_IMAGE_SIZES =
	"(min-width: 73rem) 33.25rem, (min-width: 62.5rem) calc(50vw - 3.25rem), (min-width: 42rem) calc(46vw - 0.75rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";

export type CardImagePiece = Pick<Essay | Project, "cover" | "slug">;

export interface CardImageCandidate {
	width: number;
	height: number;
	avifSrc: string;
	webpSrc: string;
}

export interface CardImagePlan {
	source: string;
	candidates: CardImageCandidate[];
}

/** The image source used by cards and social previews for a piece. */
export function cardImageSource(piece: CardImagePiece): string {
	return piece.cover ?? `/img/placeholders/${piece.slug}.jpg`;
}

/**
 * Exact 16:9 widths a source can provide. The final candidate uses the
 * largest integer 16:9 crop supported by both source dimensions.
 */
export function cardCandidateWidths(size: ImageSize): number[] {
	const units = Math.floor(
		Math.min(size.width / RATIO_WIDTH, size.height / RATIO_HEIGHT),
	);
	const maximum = units * RATIO_WIDTH;
	if (maximum === 0) {
		return [];
	}
	return [
		...new Set([...CARD_WIDTHS.filter((width) => width <= maximum), maximum]),
	].sort((a, b) => a - b);
}

function renditionSrc(src: string, width: number, extension: string): string {
	return src.replace(/\.(jpe?g)$/i, `.card-${width}w.${extension}`);
}

export function cardImagePlan(src: string): CardImagePlan | undefined {
	if (!isInternalJpeg(src)) {
		return undefined;
	}
	const size = imageSize(src);
	if (size === undefined) {
		return undefined;
	}
	const candidates = cardCandidateWidths(size).map((width) => ({
		width,
		height: (width / RATIO_WIDTH) * RATIO_HEIGHT,
		avifSrc: renditionSrc(src, width, "avif"),
		webpSrc: renditionSrc(src, width, "webp"),
	}));
	return candidates.length === 0 ? undefined : { source: src, candidates };
}

/** Resolve and deduplicate every responsive card source in a collection. */
export function cardImagePlans(
	pieces: readonly CardImagePiece[],
): CardImagePlan[] {
	const sources = new Set(pieces.map(cardImageSource));
	return [...sources]
		.map(cardImagePlan)
		.filter((plan): plan is CardImagePlan => plan !== undefined);
}
