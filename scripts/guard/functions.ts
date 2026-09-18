import * as ts from "typescript";
import { MAX_BODY_LINES, MAX_PARAMETERS } from "./limits.js";
import type { CheckContext } from "./limits.js";

export function functionParams(
	node: ts.Node,
): readonly ts.ParameterDeclaration[] {
	return ts.isFunctionLike(node) ? node.parameters : [];
}

export function functionBody(node: ts.Node): ts.Node | undefined {
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isMethodDeclaration(node) ||
		ts.isGetAccessorDeclaration(node) ||
		ts.isSetAccessorDeclaration(node) ||
		ts.isConstructorDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node)
	) {
		return node.body;
	}
	return undefined;
}

export function boundNameList(name: ts.BindingName): string[] {
	if (ts.isIdentifier(name)) {
		return [name.text];
	}
	const found: string[] = [];
	for (const element of name.elements) {
		if (!ts.isOmittedExpression(element)) {
			found.push(...boundNameList(element.name));
		}
	}
	return found;
}

export function describeFunction(node: ts.Node): string {
	if (ts.isConstructorDeclaration(node)) {
		return "constructor";
	}
	if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
		return "accessor";
	}
	if (ts.isMethodDeclaration(node) || ts.isFunctionDeclaration(node)) {
		const name = node.name;
		if (name !== undefined && ts.isIdentifier(name)) {
			return `function "${name.text}"`;
		}
		return "anonymous function";
	}
	if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
		return "arrow/function expression";
	}
	return "function signature";
}

export function positionOf(ctx: CheckContext, pos: number): number {
	return ts.getLineAndCharacterOfPosition(ctx.sourceFile, pos).line + 1;
}

export function report(
	ctx: CheckContext,
	node: ts.Node,
	message: string,
): void {
	ctx.out.push({
		file: ctx.file,
		line: positionOf(ctx, node.getStart(ctx.sourceFile)),
		message,
	});
}

export function checkCounts(node: ts.Node, ctx: CheckContext): void {
	const params = functionParams(node);
	if (params.length > MAX_PARAMETERS) {
		report(
			ctx,
			node,
			`${describeFunction(node)} has ${params.length} parameters (max ${MAX_PARAMETERS})`,
		);
	}
	const body = functionBody(node);
	if (body !== undefined && ts.isBlock(body)) {
		const start = positionOf(ctx, body.getStart(ctx.sourceFile));
		const end = positionOf(ctx, body.end);
		const inside = Math.max(0, end - start - 1);
		if (inside > MAX_BODY_LINES) {
			report(
				ctx,
				node,
				`${describeFunction(node)} body has ${inside} lines (max ${MAX_BODY_LINES})`,
			);
		}
	}
}
