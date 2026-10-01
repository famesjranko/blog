import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import { checkSuppressions } from "./guard/comments.js";
import { visitFunction } from "./guard/mutation.js";
import {
	MAX_CLASSES_PER_FILE,
	MAX_SOURCE_LINES,
	MAX_STYLE_LINES,
	MAX_TEST_LINES,
} from "./guard/limits.js";
import type { CheckContext, Violation } from "./guard/limits.js";

// Roots may be directories or single files; root config files run in the
// build and test toolchain, so they are held to the same rules as scripts.
const ROOTS = [
	"src",
	"scripts",
	"styles",
	"static",
	"tests",
	"playwright.config.ts",
	"vitest.config.ts",
];
const SCRIPT_EXTENSIONS = [".ts", ".js", ".mjs"];

function listFiles(target: string): string[] {
	if (!statSync(target).isDirectory()) {
		return [target];
	}
	return readdirSync(target).flatMap((entry) =>
		listFiles(path.join(target, entry)),
	);
}

function isScript(file: string): boolean {
	return SCRIPT_EXTENSIONS.some((extension) => file.endsWith(extension));
}

function isTest(file: string): boolean {
	return file.endsWith(".test.ts") || file.endsWith(".spec.ts");
}

function targetFiles(): string[] {
	return ROOTS.filter((root) => existsSync(root))
		.flatMap(listFiles)
		.filter((f) => isScript(f) || f.endsWith(".css"))
		.sort();
}

function countLines(text: string): number {
	const parts = text.split("\n");
	return text.endsWith("\n") ? parts.length - 1 : parts.length;
}

function checkFileLength(file: string, text: string): Violation[] {
	const lines = countLines(text);
	const limit = file.endsWith(".css")
		? MAX_STYLE_LINES
		: isTest(file)
			? MAX_TEST_LINES
			: MAX_SOURCE_LINES;
	if (lines <= limit) {
		return [];
	}
	return [{ file, line: 1, message: `file has ${lines} lines (max ${limit})` }];
}

function checkTree(sourceFile: ts.SourceFile, file: string): Violation[] {
	const ctx: CheckContext = { sourceFile, file, out: [] };
	let classes = 0;
	const find = (node: ts.Node): void => {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
			classes += 1;
		}
		if (ts.isFunctionLike(node)) {
			visitFunction(node, new Set(), ctx);
			return;
		}
		ts.forEachChild(node, find);
	};
	ts.forEachChild(sourceFile, find);
	if (classes > MAX_CLASSES_PER_FILE) {
		ctx.out.push({
			file,
			line: 1,
			message: `file defines ${classes} classes (max ${MAX_CLASSES_PER_FILE})`,
		});
	}
	return ctx.out;
}

function main(): number {
	const violations: Violation[] = [];
	const files = targetFiles();
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		violations.push(...checkSuppressions(file, text));
		violations.push(...checkFileLength(file, text));
		if (isScript(file)) {
			const sourceFile = ts.createSourceFile(
				file,
				text,
				ts.ScriptTarget.ES2022,
				true,
			);
			violations.push(...checkTree(sourceFile, file));
		}
	}
	if (violations.length > 0) {
		for (const violation of violations) {
			console.error(
				`${violation.file}:${violation.line}: ${violation.message}`,
			);
		}
		console.error(
			`guard: ${violations.length} violation(s) in ${files.length} file(s)`,
		);
		return 1;
	}
	console.log(`guard: OK (${files.length} files)`);
	return 0;
}

process.exitCode = main();
