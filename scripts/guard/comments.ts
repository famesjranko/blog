import type { Violation } from "./limits.js";

// Suppression directives that must never appear in authored code.
// Matched inside comments only: the same text inside a string literal
// cannot suppress anything, so it is not flagged. The marker list
// itself lives here as strings, which is why comment-awareness matters.
const SUPPRESSION_MARKERS = [
	"@ts-ignore",
	"@ts-expect-error",
	"@ts-nocheck",
	"eslint-disable",
	"biome-ignore",
];

type ScanMode = "code" | "line" | "block" | "sq" | "dq" | "tpl";

interface CommentPart {
	line: number;
	text: string;
}

// Character-level scan of comment text with its line number.
// String-aware so markers inside string literals are not flagged.
// Limitation: ${} expressions inside template literals are treated
// as opaque string content (a directive there is vanishingly rare).
export class CommentScanner {
	private mode: ScanMode = "code";
	private line = 1;
	private current = "";
	private readonly parts: CommentPart[] = [];

	scan(source: string): CommentPart[] {
		let i = 0;
		while (i < source.length) {
			const ch = source[i];
			if (ch === "\n") {
				this.endLine();
				i += 1;
			} else if (this.mode === "line" || this.mode === "block") {
				i = this.consumeComment(source, i);
			} else if (this.mode === "code") {
				i = this.consumeCode(source, i);
			} else {
				i = this.consumeString(source, i);
			}
		}
		this.endLine();
		return this.parts;
	}

	private endLine(): void {
		if (this.current !== "") {
			this.parts.push({ line: this.line, text: this.current });
			this.current = "";
		}
		if (this.mode === "line") {
			this.mode = "code";
		}
		this.line += 1;
	}

	private consumeComment(source: string, i: number): number {
		const ch = source[i];
		const next = source[i + 1] ?? "";
		if (this.mode === "block" && ch === "*" && next === "/") {
			this.mode = "code";
			return i + 2;
		}
		this.current += ch;
		return i + 1;
	}

	private consumeCode(source: string, i: number): number {
		const ch = source[i];
		const next = source[i + 1] ?? "";
		if (ch === "/" && next === "/") {
			this.mode = "line";
			return i + 2;
		}
		if (ch === "/" && next === "*") {
			this.mode = "block";
			return i + 2;
		}
		if (ch === "'") {
			this.mode = "sq";
		} else if (ch === '"') {
			this.mode = "dq";
		} else if (ch === "`") {
			this.mode = "tpl";
		}
		return i + 1;
	}

	private consumeString(source: string, i: number): number {
		const ch = source[i];
		const quote = this.mode === "sq" ? "'" : this.mode === "dq" ? '"' : "`";
		if (ch === "\\") {
			return i + 2;
		}
		if (ch === quote) {
			this.mode = "code";
		}
		return i + 1;
	}
}

export function checkSuppressions(file: string, text: string): Violation[] {
	const found: Violation[] = [];
	for (const part of new CommentScanner().scan(text)) {
		for (const marker of SUPPRESSION_MARKERS) {
			if (part.text.includes(marker)) {
				found.push({
					file,
					line: part.line,
					message: `suppression directive "${marker}" is banned`,
				});
			}
		}
	}
	return found;
}
