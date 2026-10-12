import {
	CARD_IMAGE_SIZES,
	cardImagePlan,
	cardImageSource,
} from "../cardImages.js";
import type { Essay, Project } from "../content.js";
import { imageSize } from "../images.js";
import { type RenditionPlan, renditionSources } from "../renditions.js";
import { siteUrl } from "../site.js";
import { escapeHtml } from "./layout.js";

/**
 * Card cover: the explicit image when set, otherwise the rendered
 * placeholder art for the slug, which is decorative and so carries an
 * empty alt. Root-relative sources are prefixed with the site base
 * path, mirroring the markdown image rule, so covers keep working
 * under BASE_PATH. An internal JPEG cover listed in the size table
 * renders as `<picture>` with responsive AVIF and WebP sources, and the
 * original file remains the fallback `<img>`. Any other cover, including
 * an internal JPEG the size table does not list, renders as a bare `<img>`.
 * A draft (only ever built under SHOW_DRAFTS) gets a badge over the art.
 */
export type CoverPiece = Pick<
	Essay | Project,
	"cover" | "coverAlt" | "slug" | "draft"
>;

export const DRAFT_BADGE = `<span class="draft-badge">Draft</span>`;

/** Card class list; drafts get a modifier so the whole card reads as one. */
export function cardClass(piece: Pick<CoverPiece, "draft">): string {
	return piece.draft ? "card card-draft" : "card";
}

export function cardCover(
	piece: CoverPiece,
	sizes: string = CARD_IMAGE_SIZES,
): string {
	const badge = piece.draft ? DRAFT_BADGE : "";
	return `<div class="card-media">${coverPicture(piece, sizes)}${badge}</div>`;
}

/** A cover's image, served from card crops unless another plan is given. */
export function coverPicture(
	piece: CoverPiece,
	sizes: string,
	planFor: (src: string) => RenditionPlan | undefined = cardImagePlan,
): string {
	const { cover, coverAlt } = piece;
	const src = coverSrc(piece);
	const alt = cover === undefined ? "" : (coverAlt ?? "");
	const url = src.startsWith("/") && !src.startsWith("//") ? siteUrl(src) : src;
	const size = imageSize(src);
	const dimensions =
		size === undefined ? "" : ` width="${size.width}" height="${size.height}"`;
	const img = `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${dimensions} loading="lazy" decoding="async">`;
	const plan = planFor(src);
	if (plan === undefined) {
		return img;
	}
	const sources = renditionSources(plan, { sizes, url: siteUrl, escapeHtml });
	return `<picture>${sources}${img}</picture>`;
}

/** The image source used by cards and social previews for a piece. */
export function coverSrc(piece: Pick<CoverPiece, "cover" | "slug">): string {
	return cardImageSource(piece);
}
