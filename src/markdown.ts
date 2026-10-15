import MarkdownIt, {
	type MarkdownIt as MarkdownItInstance,
	type RendererRule,
	type Token,
} from "markdown-it";
import { markFigureParagraphs } from "./markdownFigures.js";
import { renderImage } from "./markdownImages.js";
import {
	attrText,
	baseHtmlPaths,
	isExternalLink,
	openExternalHtmlLinks,
} from "./markdownLinks.js";
import { internalUrl } from "./site.js";

let renderer: MarkdownItInstance | undefined;

const ATTRIBUTION_PATTERN = /^\([^()]*\)\.?$/;

/**
 * A blockquote's closing line is an attribution when it is only a
 * parenthetical citation.
 */
function isAttribution(text: string): boolean {
	return ATTRIBUTION_PATTERN.test(text.trim());
}

function markAttribution(tokens: Token[], index: number): void {
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
	tokens: Token[],
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
function markQuoteAttributions(md: MarkdownItInstance): void {
	md.core.ruler.push("blockquote_attribution", (state) => {
		let tracker: QuoteTracker = { level: -1, candidate: -1 };
		for (let i = 0; i < state.tokens.length; i++) {
			tracker = trackToken(state.tokens, tracker, i);
		}
	});
}

/**
 * External links open in a new tab; internal root-relative links get the
 * site base path so cross-links survive a project-site deployment.
 */
function renderLink(md: MarkdownItInstance): RendererRule {
	return (tokens, idx, options) => {
		const link = tokens[idx];
		const href = link === undefined ? null : attrText(link, "href");
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

function renderHtml(): RendererRule {
	return (tokens, idx) =>
		openExternalHtmlLinks(baseHtmlPaths(tokens[idx]?.content ?? ""));
}

/**
 * A table cannot shrink below its widest words, so on a phone a wide one
 * would widen the whole page. The wrapper scrolls it in place instead.
 */
function wrapTables(md: MarkdownItInstance): void {
	Object.assign(md.renderer.rules, {
		table_open: () => '<div class="table-scroll">\n<table>\n',
		table_close: () => "</table>\n</div>\n",
	});
}

function buildRenderer(): MarkdownItInstance {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,
	});
	markQuoteAttributions(md);
	markFigureParagraphs(md);
	const renderDiagramOpen: RendererRule = (tokens, idx, options) =>
		tokens[idx]?.attrGet("class") === "diagram-pair"
			? '<div class="diagram-pair">'
			: md.renderer.renderToken(tokens, idx, options);
	const renderDiagramClose: RendererRule = (tokens, idx, options) =>
		tokens[idx]?.attrGet("class") === "diagram-pair"
			? "</div>"
			: md.renderer.renderToken(tokens, idx, options);
	Object.assign(md.renderer.rules, {
		paragraph_open: renderDiagramOpen,
		paragraph_close: renderDiagramClose,
	});
	const { image: fallbackImage } = md.renderer.rules;
	if (fallbackImage !== undefined) {
		Object.assign(md.renderer.rules, {
			image: renderImage(md, fallbackImage),
		});
	}
	Object.assign(md.renderer.rules, {
		link_open: renderLink(md),
		html_block: renderHtml(),
		html_inline: renderHtml(),
	});
	wrapTables(md);
	return md;
}

function markdownRenderer(): MarkdownItInstance {
	renderer ??= buildRenderer();
	return renderer;
}

export function renderMarkdown(source: string): string {
	return markdownRenderer().render(source);
}

/**
 * Sources of every image in a markdown body, in document order. The
 * build generates renditions only for these, so unused images cost nothing.
 */
export function markdownImageSources(source: string): string[] {
	return markdownRenderer()
		.parse(source, {})
		.flatMap((token) => token.children ?? [])
		.filter((child) => child.type === "image")
		.map((child) => child.attrGet("src"))
		.filter((src): src is string => src !== null);
}
