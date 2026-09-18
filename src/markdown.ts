import MarkdownIt from "markdown-it";

let renderer: MarkdownIt | undefined;

export function renderMarkdown(source: string): string {
	renderer ??= new MarkdownIt({
		html: false,
		linkify: true,
		typographer: true,
	});
	return renderer.render(source);
}
