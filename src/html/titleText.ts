import { escapeHtml } from "./layout.js";

/** A run of non-space characters joined by at least one hyphen. */
const HYPHENATED = /[^\s-]+(?:-[^\s-]+)+/g;

/**
 * Escaped title markup that keeps hyphenated words whole. A browser may
 * break a line after any hyphen, and balanced wrapping then splits
 * "Connect-4" as "Connect-" / "4". Each such word sits in a span that
 * does not wrap, so a title breaks only at its spaces. Use it for
 * visible headings and links only, never for attribute or feed text.
 */
export function titleHtml(title: string): string {
	let html = "";
	let end = 0;
	for (const match of title.matchAll(HYPHENATED)) {
		html += escapeHtml(title.slice(end, match.index));
		html += `<span class="nowrap">${escapeHtml(match[0])}</span>`;
		end = match.index + match[0].length;
	}
	return html + escapeHtml(title.slice(end));
}
