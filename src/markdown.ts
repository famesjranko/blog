import MarkdownIt from "markdown-it";
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

function buildRenderer(): MarkdownIt {
	const md = new MarkdownIt({
		html: false,
		linkify: true,
		typographer: true,
	});
	const fallback = md.renderer.rules.image;
	if (fallback !== undefined) {
		md.renderer.rules.image = (tokens, idx, options, env) => {
			const src = tokens[idx]?.attrGet("src");
			if (typeof src === "string") {
				tokens[idx]?.attrSet("src", imageSrc(src));
			}
			return fallback(tokens, idx, options, env, md.renderer);
		};
	}
	return md;
}

export function renderMarkdown(source: string): string {
	renderer ??= buildRenderer();
	return renderer.render(source);
}
