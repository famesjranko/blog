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

function listFiles(dir: string): string[] {
	const found: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) {
			found.push(...listFiles(full));
		} else {
			found.push(full);
		}
	}
	return found;
}

function targetFiles(): string[] {
	const files: string[] = [];
	for (const root of ["src", "scripts", "styles", "static"]) {
		if (existsSync(root)) {
			files.push(...listFiles(root));
		}
	}
	return files
		.filter((f) => f.endsWith(".ts") || f.endsWith(".css") || f.endsWith(".js"))
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
		: file.endsWith(".test.ts")
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
		if (file.endsWith(".ts") || file.endsWith(".js")) {
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
