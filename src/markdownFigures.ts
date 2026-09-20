import type MarkdownIt from "markdown-it";

type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

function isTitledImage(token: MarkdownToken | undefined): boolean {
	return token?.type === "image" && Boolean(token.attrGet("title")?.trim());
}

function isFigureParagraph(
	open: MarkdownToken | undefined,
	inline: MarkdownToken | undefined,
	close: MarkdownToken | undefined,
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
	open: MarkdownToken | undefined,
	inline: MarkdownToken | undefined,
	close: MarkdownToken | undefined,
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
	const markParagraph = (tokens: MarkdownToken[], index: number): void => {
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
