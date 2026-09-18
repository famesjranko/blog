import * as ts from "typescript";
import {
	boundNameList,
	checkCounts,
	functionBody,
	functionParams,
	report,
} from "./functions.js";
import type { CheckContext } from "./limits.js";

function rootName(expr: ts.Expression): string | undefined {
	let current: ts.Expression = expr;
	while (true) {
		if (ts.isIdentifier(current)) {
			return current.text;
		}
		if (
			ts.isParenthesizedExpression(current) ||
			ts.isNonNullExpression(current)
		) {
			current = current.expression;
		} else if (
			ts.isPropertyAccessExpression(current) ||
			ts.isElementAccessExpression(current)
		) {
			current = current.expression;
		} else {
			return undefined;
		}
	}
}

function isScopedTarget(target: ts.Expression, scope: Set<string>): boolean {
	if (
		!ts.isPropertyAccessExpression(target) &&
		!ts.isElementAccessExpression(target)
	) {
		return false;
	}
	const root = rootName(target);
	return root !== undefined && scope.has(root);
}

function mentionsScopedTarget(node: ts.Node, scope: Set<string>): boolean {
	if (
		ts.isPropertyAccessExpression(node) ||
		ts.isElementAccessExpression(node)
	) {
		const root = rootName(node);
		return root !== undefined && scope.has(root);
	}
	let found = false;
	ts.forEachChild(node, (child) => {
		if (!found && mentionsScopedTarget(child, scope)) {
			found = true;
		}
	});
	return found;
}

function destructuringMutatesScope(
	target: ts.Expression,
	scope: Set<string>,
): boolean {
	if (isScopedTarget(target, scope)) {
		return true;
	}
	if (
		ts.isObjectLiteralExpression(target) ||
		ts.isArrayLiteralExpression(target)
	) {
		return mentionsScopedTarget(target, scope);
	}
	return false;
}

function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
	return (
		kind >= ts.SyntaxKind.EqualsToken && kind <= ts.SyntaxKind.CaretEqualsToken
	);
}

function isIncrementOperator(kind: ts.SyntaxKind): boolean {
	return (
		kind === ts.SyntaxKind.PlusPlusToken ||
		kind === ts.SyntaxKind.MinusMinusToken
	);
}

function checkMutationStatement(
	node: ts.Node,
	scope: Set<string>,
	ctx: CheckContext,
): void {
	if (ts.isBinaryExpression(node)) {
		checkAssignmentMutation(node, scope, ctx);
		return;
	}
	if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
		checkIncrementMutation(node, scope, ctx);
		return;
	}
	if (ts.isDeleteExpression(node)) {
		checkDeleteMutation(node, scope, ctx);
	}
}

function checkAssignmentMutation(
	node: ts.BinaryExpression,
	scope: Set<string>,
	ctx: CheckContext,
): void {
	if (
		isAssignmentOperator(node.operatorToken.kind) &&
		destructuringMutatesScope(node.left, scope)
	) {
		reportMutation(node, ctx);
	}
}

function checkIncrementMutation(
	node: ts.PrefixUnaryExpression | ts.PostfixUnaryExpression,
	scope: Set<string>,
	ctx: CheckContext,
): void {
	if (
		isIncrementOperator(node.operator) &&
		isScopedTarget(node.operand, scope)
	) {
		reportMutation(node, ctx);
	}
}

function checkDeleteMutation(
	node: ts.DeleteExpression,
	scope: Set<string>,
	ctx: CheckContext,
): void {
	if (isScopedTarget(node.expression, scope)) {
		reportMutation(node, ctx);
	}
}

function reportMutation(node: ts.Node, ctx: CheckContext): void {
	report(
		ctx,
		node,
		"mutation of function parameter property is banned (copy it first)",
	);
}

// Names declared directly in a block shadow outer parameters for the
// whole block walk. Over-approximate on purpose: this can only hide
// violations, never invent them.
function blockDeclarations(block: ts.Block): Set<string> {
	const declared = new Set<string>();
	for (const statement of block.statements) {
		for (const name of declarationNames(statement)) {
			declared.add(name);
		}
	}
	return declared;
}

function declarationNames(statement: ts.Statement): string[] {
	if (ts.isVariableStatement(statement)) {
		return variableNames(statement);
	}
	if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
		return statement.name === undefined ? [] : [statement.name.text];
	}
	return [];
}

function variableNames(statement: ts.VariableStatement): string[] {
	const found: string[] = [];
	for (const declaration of statement.declarationList.declarations) {
		found.push(...boundNameList(declaration.name));
	}
	return found;
}

function visitFunctionBody(
	body: ts.Node,
	scope: Set<string>,
	ctx: CheckContext,
): void {
	if (ts.isFunctionLike(body)) {
		visitFunction(body, scope, ctx);
		return;
	}
	checkMutationStatement(body, scope, ctx);
	if (ts.isBlock(body)) {
		const inner = new Set(scope);
		for (const name of blockDeclarations(body)) {
			inner.delete(name);
		}
		ts.forEachChild(body, (child) => visitFunctionBody(child, inner, ctx));
		return;
	}
	ts.forEachChild(body, (child) => visitFunctionBody(child, scope, ctx));
}

export function visitFunction(
	node: ts.Node,
	visible: Set<string>,
	ctx: CheckContext,
): void {
	checkCounts(node, ctx);
	const own = new Set<string>();
	for (const param of functionParams(node)) {
		for (const name of boundNameList(param.name)) {
			own.add(name);
		}
	}
	const scope = new Set<string>();
	for (const name of visible) {
		if (!own.has(name)) {
			scope.add(name);
		}
	}
	for (const name of own) {
		scope.add(name);
	}
	const body = functionBody(node);
	if (body !== undefined) {
		visitFunctionBody(body, scope, ctx);
	}
}
