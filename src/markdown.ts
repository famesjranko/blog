import MarkdownIt from "markdown-it";
import { webpSrc } from "./images.js";
import { siteUrl } from "./site.js";

let renderer: MarkdownIt | undefined;

/**
 * Prefix internal root-relative image URLs with the site base path.
 * Leaves protocol-relative, external, relative, and other schemes alone.
 */
function imageSrc(path: string): string {
	if (path.startsWith("/") && !path.startsWith("//")) {
		return siteUrl(path);
	}
	return path;
}

function isExternalLink(href: string): boolean {
	return (
		href.startsWith("http://") ||
		href.startsWith("https://") ||
		href.startsWith("//")
	);
}

const ATTRIBUTION_PATTERN = /^\([^()]*\)\.?$/;

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

/**
 * A blockquote's closing line is an attribution when it is only a
 * parenthetical citation.
 */
function isAttribution(text: string): boolean {
	return ATTRIBUTION_PATTERN.test(text.trim());
}

function markAttribution(tokens: MarkdownToken[], index: number): void {
	const open = tokens[index];
	const inline = tokens[index + 1];
	if (open?.type !== "paragraph_open" || inline?.type !== "inline") {
		return;
	}
	if (isAttribution(inline.content)) {
		open.attrSet("class", "attribution");
	}
}

interface QuoteTracker {
	level: number;
	candidate: number;
}

function trackToken(
	tokens: MarkdownToken[],
	tracker: QuoteTracker,
	index: number,
): QuoteTracker {
	const token = tokens[index];
	if (token === undefined) {
		return tracker;
	}
	if (token.type === "blockquote_open") {
		return { level: token.level, candidate: -1 };
	}
	if (token.type === "blockquote_close" && token.level === tracker.level) {
		markAttribution(tokens, tracker.candidate);
		return { level: -1, candidate: -1 };
	}
	if (
		tracker.level >= 0 &&
		token.level === tracker.level + 1 &&
		token.nesting === 1
	) {
		return {
			level: tracker.level,
			candidate: token.type === "paragraph_open" ? index : -1,
		};
	}
	return tracker;
}

function isFigureParagraph(
	open: MarkdownToken | undefined,
	inline: MarkdownToken | undefined,
	close: MarkdownToken | undefined,
): boolean {
	if (
		open?.type !== "paragraph_open" ||
		inline?.type !== "inline" ||
		close?.type !== "paragraph_close"
	) {
		return false;
	}
	const children = inline.children ?? [];
	if (children.length !== 1) {
		return false;
	}
	const image = children[0];
	if (image?.type !== "image") {
		return false;
	}
	const title = image.attrGet("title");
	return title !== null && title.trim() !== "";
}

/**
 * A paragraph holding only a titled image is a figure: hide the paragraph
 * tags so the image rule's figure element is not nested inside a p.
 */
function untagFigureParagraphs(md: MarkdownIt): void {
	md.core.ruler.push("figure_paragraphs", (state) => {
		const tokens = state.tokens;
		for (let i = 0; i + 2 < tokens.length; i++) {
			if (isFigureParagraph(tokens[i], tokens[i + 1], tokens[i + 2])) {
				const open = tokens[i];
				const close = tokens[i + 2];
				if (open !== undefined && close !== undefined) {
					open.hidden = true;
					close.hidden = true;
				}
			}
		}
	});
}
/**
 * Tag a trailing citation paragraph inside a blockquote so prose styles
 * can right-align it. Only the last block child qualifies, so ordinary
 * closing sentences are never affected.
 */
function markQuoteAttributions(md: MarkdownIt): void {
	md.core.ruler.push("blockquote_attribution", (state) => {
		let tracker: QuoteTracker = { level: -1, candidate: -1 };
		for (let i = 0; i < state.tokens.length; i++) {
			tracker = trackToken(state.tokens, tracker, i);
		}
	});
}

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

type ImageRenderRule = NonNullable<MarkdownIt["renderer"]["rules"]["image"]>;
type LinkRenderRule = NonNullable<MarkdownIt["renderer"]["rules"]["link_open"]>;

interface ImageRenderContext {
	md: MarkdownIt;
	fallback: ImageRenderRule;
	source: ImageSource;
	options: Parameters<ImageRenderRule>[2];
	env: Parameters<ImageRenderRule>[3];
}

function renderImageBody(context: ImageRenderContext): string {
	const { md, fallback, source, options, env } = context;
	const src = source.tokens[source.index]?.attrGet("src");
	if (typeof src === "string") {
		source.tokens[source.index]?.attrSet("src", imageSrc(src));
	}
	const img = fallback(source.tokens, source.index, options, env, md.renderer);
	const webp = typeof src === "string" ? webpSrc(src) : undefined;
	if (webp === undefined) {
		return img;
	}
	const webpUrl = md.utils.escapeHtml(imageSrc(webp));
	return `<picture><source type="image/webp" srcset="${webpUrl}">${img}</picture>`;
}

function buildRenderer(): MarkdownIt {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
	});
	markQuoteAttributions(md);
	untagFigureParagraphs(md);
	const fallback = md.renderer.rules.image;
	if (fallback !== undefined) {
		md.renderer.rules.image = (tokens, idx, options, env) => {
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
	const renderExternalLink: LinkRenderRule = (tokens, idx, options) => {
		const link = tokens[idx];
		if (link !== undefined) {
			const href = link.attrGet("href");
			if (href !== null && isExternalLink(href)) {
				link.attrSet("target", "_blank");
				link.attrSet("rel", "noopener noreferrer");
			}
		}
		return md.renderer.renderToken(tokens, idx, options);
	};
	Object.assign(md.renderer.rules, { link_open: renderExternalLink });
	return md;
}

export function renderMarkdown(source: string): string {
	renderer ??= buildRenderer();
	return renderer.render(source);
}
