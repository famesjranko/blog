import type * as ts from "typescript";

// Structural budgets. Every number here is enforced by `make check`
// (via `make guard`), not advisory. Tests get a larger file budget; nothing is excluded.
export const MAX_SOURCE_LINES = 250;
export const MAX_TEST_LINES = 400;
export const MAX_STYLE_LINES = 400;
export const MAX_BODY_LINES = 50;
export const MAX_PARAMETERS = 4;
export const MAX_CLASSES_PER_FILE = 1;

export interface Violation {
	file: string;
	line: number;
	message: string;
}

export interface CheckContext {
	sourceFile: ts.SourceFile;
	file: string;
	out: Violation[];
}
