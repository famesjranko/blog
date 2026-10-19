import type { MarkdownIt, Token } from "markdown-it";
import { attrText } from "./markdownLinks.js";

function isTitledImage(token: Token | undefined): boolean {
	return token?.type === "image" && Boolean(attrText(token, "title")?.trim());
}

function isFigureParagraph(
	open: Token | undefined,
	inline: Token | undefined,
	close: Token | undefined,
): boolean {
	const children = inline?.children ?? [];
	return (
		open?.type === "paragraph_open" &&
		inline?.type === "inline" &&
		close?.type === "paragraph_close" &&
		children.length === 1 &&
		isTitledImage(children[0])
	);
}

function markDiagramPair(
	open: Token | undefined,
	inline: Token | undefined,
	close: Token | undefined,
): boolean {
	const children = (inline?.children ?? []).filter(
		(child) => child.type !== "text" || child.content.trim() !== "",
	);
	if (
		open?.type !== "paragraph_open" ||
		inline?.type !== "inline" ||
		close?.type !== "paragraph_close" ||
		children.length !== 2 ||
		!children.every(isTitledImage)
	) {
		return false;
	}
	open.attrSet("class", "diagram-pair");
	close.attrSet("class", "diagram-pair");
	return true;
}

export function markFigureParagraphs(md: MarkdownIt): void {
	const markParagraph = (tokens: Token[], index: number): void => {
		const open = tokens[index];
		const inline = tokens[index + 1];
		const close = tokens[index + 2];
		if (markDiagramPair(open, inline, close)) {
			return;
		}
		if (isFigureParagraph(open, inline, close) && open && close) {
			open.hidden = true;
			close.hidden = true;
		}
	};
	md.core.ruler.push("figure_paragraphs", (state) => {
		const tokens = state.tokens;
		for (let i = 0; i + 2 < tokens.length; i++) {
			markParagraph(tokens, i);
		}
	});
}
