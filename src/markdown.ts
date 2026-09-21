import MarkdownIt from "markdown-it";
import { imageSize, webpSrc } from "./images.js";
import { markFigureParagraphs } from "./markdownFigures.js";
import { siteUrl } from "./site.js";
import { inlineSvg } from "./svgInline.js";

let renderer: MarkdownIt | undefined;

/**
 * Prefix internal root-relative URLs (image src and link href) with the
 * site base path. Leaves protocol-relative, external, relative, anchor,
 * and other schemes alone.
 */
function internalUrl(path: string): string {
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
type ParagraphRenderRule = NonNullable<
	MarkdownIt["renderer"]["rules"]["paragraph_open"]
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
 * External links open in a new tab; internal root-relative links get the
 * site base path so cross-links survive a project-site deployment.
 */
function renderLink(md: MarkdownIt): LinkRenderRule {
	return (tokens, idx, options) => {
		const link = tokens[idx];
		const href = link?.attrGet("href") ?? null;
		if (link !== undefined && href !== null) {
			if (isExternalLink(href)) {
				link.attrSet("target", "_blank");
				link.attrSet("rel", "noopener noreferrer");
			} else {
				link.attrSet("href", internalUrl(href));
			}
		}
		return md.renderer.renderToken(tokens, idx, options);
	};
}

function buildRenderer(): MarkdownIt {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
	});
	markQuoteAttributions(md);
	markFigureParagraphs(md);
	const renderDiagramOpen: ParagraphRenderRule = (tokens, idx, options) =>
		tokens[idx]?.attrGet("class") === "diagram-pair"
			? '<div class="diagram-pair">'
			: md.renderer.renderToken(tokens, idx, options);
	const renderDiagramClose: ParagraphRenderRule = (tokens, idx, options) =>
		tokens[idx]?.attrGet("class") === "diagram-pair"
			? "</div>"
			: md.renderer.renderToken(tokens, idx, options);
	Object.assign(md.renderer.rules, {
		paragraph_open: renderDiagramOpen,
		paragraph_close: renderDiagramClose,
	});
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
	Object.assign(md.renderer.rules, { link_open: renderLink(md) });
	return md;
}

export function renderMarkdown(source: string): string {
	renderer ??= buildRenderer();
	return renderer.render(source);
}
