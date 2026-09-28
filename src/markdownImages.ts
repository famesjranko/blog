import type MarkdownIt from "markdown-it";
import { imageSize, webpSrc } from "./images.js";
import { internalUrl } from "./site.js";
import { inlineSvg } from "./svgInline.js";

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

interface ImageSource {
	tokens: MarkdownToken[];
	index: number;
}

interface FigureImage extends ImageSource {
	caption: string;
}

/**
 * An image with a title becomes a figure: the title is promoted to a
 * visible caption, so it is stripped from the img hover text. The token
 * is copied first; mutating a parameter property is banned. A trailing
 * backslash inside the title starts a new caption line.
 */
function asFigure(
	tokens: MarkdownToken[],
	index: number,
): FigureImage | undefined {
	const token = tokens[index];
	if (token === undefined) {
		return undefined;
	}
	const title = token.attrGet("title");
	if (title === null || title.trim() === "") {
		return undefined;
	}
	const copy: MarkdownToken = Object.assign(
		Object.create(Object.getPrototypeOf(token)),
		token,
	);
	copy.attrs = (copy.attrs ?? []).filter(([name]) => name !== "title");
	return { tokens: [copy], index: 0, caption: title };
}

export type ImageRenderRule = NonNullable<
	MarkdownIt["renderer"]["rules"]["image"]
>;

interface ImageRenderContext {
	md: MarkdownIt;
	fallback: ImageRenderRule;
	source: ImageSource;
	options: Parameters<ImageRenderRule>[2];
	env: Parameters<ImageRenderRule>[3];
}

/** Rewrite src for the base path and reserve the box for shipped images. */
function prepareImageToken(token: MarkdownToken, src: string): void {
	token.attrSet("src", internalUrl(src));
	const size = imageSize(src);
	if (size !== undefined) {
		token.attrSet("width", String(size.width));
		token.attrSet("height", String(size.height));
	}
}

function renderImageBody(context: ImageRenderContext): string {
	const { md, fallback, source, options, env } = context;
	const token = source.tokens[source.index];
	const src = token?.attrGet("src");
	if (token !== undefined && typeof src === "string") {
		const diagram = inlineSvg(src);
		if (diagram !== undefined) {
			return diagram;
		}
		prepareImageToken(token, src);
	}
	const img = fallback(source.tokens, source.index, options, env, md.renderer);
	const webp = typeof src === "string" ? webpSrc(src) : undefined;
	if (webp === undefined) {
		return img;
	}
	const webpUrl = md.utils.escapeHtml(internalUrl(webp));
	return `<picture><source type="image/webp" srcset="${webpUrl}">${img}</picture>`;
}

/**
 * Render images with their base path, intrinsic size, and modern-format
 * sources; inline opted-in SVG diagrams; wrap titled images in figures.
 */
export function renderImage(
	md: MarkdownIt,
	fallback: ImageRenderRule,
): ImageRenderRule {
	return (tokens, idx, options, env) => {
		const figure = asFigure(tokens, idx);
		const source: ImageSource = figure ?? { tokens, index: idx };
		const body = renderImageBody({ md, fallback, source, options, env });
		if (figure === undefined) {
			return body;
		}
		const caption = md.renderInline(figure.caption, env);
		return `<figure>${body}<figcaption>${caption}</figcaption></figure>`;
	};
}
