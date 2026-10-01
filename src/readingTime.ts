import MarkdownIt from "markdown-it";

const WORDS_PER_MINUTE = 200;
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const markdown = new MarkdownIt({ html: true });

function visibleText(body: string): string {
	// Tag stripping is approximate: comments, script/style text, quoted >, and entities can count as words.
	return markdown
		.parse(body, {})
		.flatMap((token) => {
			if (token.type === "html_block") {
				return [token.content.replace(/<[^>]*>/g, " ")];
			}
			if (token.type !== "inline") {
				return [];
			}
			return (token.children ?? []).flatMap((child) => {
				if (child.type === "text" || child.type === "code_inline") {
					return [child.content];
				}
				if (child.type === "html_inline") {
					return [child.content.replace(/<[^>]*>/g, " ")];
				}
				return [];
			});
		})
		.join(" ");
}

export function readingMinutes(body: string): number {
	const words = visibleText(body).match(WORD)?.length ?? 0;
	return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
