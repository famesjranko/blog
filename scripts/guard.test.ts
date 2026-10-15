import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// The guard scans fixed relative roots from its cwd. The suite seeds every
// fixture at its own path in one temp tree and runs the real script once
// over it. That run is the shared "When". Each test reads the outcome of one
// fixture from it. A second tree of only passing fixtures proves a clean exit.

const loader = resolve("node_modules/tsx/dist/loader.mjs");
const guard = resolve("scripts/guard.ts");

interface Fixture {
	path: string;
	content: string;
	// The violation line the guard must print, or undefined when it must pass.
	violation?: { line: number; message: string };
}

interface Run {
	status: number | null;
	stderr: string;
}

function lines(count: number, line: (index: number) => string): string {
	return Array.from({ length: count }, (_, i) => `${line(i)}\n`).join("");
}

const constants = (count: number) =>
	lines(count, (i) => `export const v${i} = ${i};`);
const rules = (count: number) => lines(count, (i) => `.c${i} { color: red; }`);

function body(count: number): string {
	return `export function f(): void {\n${lines(count, (i) => `\tconst v${i} = ${i};`)}}\n`;
}

// A body of `count` lines (51 by default) opened by `head` and closed by `tail`.
function member(head: string, tail: string, count = 51): string {
	return `${head}\n${lines(count, (i) => `\t\tconst v${i} = ${i};`)}${tail}`;
}

function params(count: number): string {
	const list = Array.from({ length: count }, (_, i) => `p${i}: number`);
	return `export function f(${list.join(", ")}): void {}\n`;
}

function inFunction(...statements: string[]): string {
	const text = statements.map((line) => `\t${line}\n`).join("");
	return `export function f(o: { x: number }): void {\n${text}}\n`;
}

function tooLong(path: string, count: number, limit: number): Fixture {
	const content = path.endsWith(".css") ? rules(count) : constants(count);
	const violation =
		count > limit
			? { line: 1, message: `file has ${count} lines (max ${limit})` }
			: undefined;
	return violation === undefined
		? { path, content }
		: { path, content, violation };
}

function mutation(name: string, statements: string[], line = 2): Fixture {
	return {
		path: `src/mut_${name}.ts`,
		content: inFunction(...statements),
		violation: {
			line,
			message:
				"mutation of function parameter property is banned (copy it first)",
		},
	};
}

const lengthFixtures = [
	tooLong("src/len_src_at.ts", 250, 250),
	tooLong("src/len_src_over.ts", 251, 250),
	tooLong("src/len_test_at.test.ts", 400, 400),
	tooLong("src/len_test_over.test.ts", 401, 400),
	tooLong("tests/len_spec_at.spec.ts", 400, 400),
	tooLong("tests/len_spec_over.spec.ts", 401, 400),
	tooLong("styles/len_css_at.css", 400, 400),
	tooLong("styles/len_css_over.css", 401, 400),
];

const budgetFixtures: Fixture[] = [
	{ path: "src/body_50.ts", content: body(50) },
	{
		path: "src/body_51.ts",
		content: body(51),
		violation: { line: 1, message: 'function "f" body has 51 lines (max 50)' },
	},
	{ path: "src/params_4.ts", content: params(4) },
	{
		path: "src/params_5.ts",
		content: params(5),
		violation: { line: 1, message: 'function "f" has 5 parameters (max 4)' },
	},
	{ path: "src/class_1.ts", content: "export class A {}\n" },
	{
		path: "src/class_2.ts",
		content: "export class A {}\nexport const B = class {};\n",
		violation: { line: 1, message: "file defines 2 classes (max 1)" },
	},
];

function longBody(name: string, text: string, line: number, kind: string) {
	return {
		path: `src/kind_${name}.ts`,
		content: text,
		violation: {
			line,
			message: `${kind} body has 51 lines (max 50)`,
		},
	};
}

// Each function-like kind the guard budgets, so dropping one is caught.
const kindFixtures: Fixture[] = [
	longBody(
		"method",
		member("export class A {\n\tm(): void {", "\t}\n}\n"),
		2,
		'function "m"',
	),
	longBody(
		"constructor",
		member("export class A {\n\tconstructor() {", "\t}\n}\n"),
		2,
		"constructor",
	),
	longBody(
		"getter",
		member(
			"export class A {\n\tget v(): number {",
			"\t\treturn 1;\n\t}\n}\n",
			50,
		),
		2,
		"accessor",
	),
	longBody(
		"setter",
		member("export class A {\n\tset v(x: number) {", "\t}\n}\n"),
		2,
		"accessor",
	),
	longBody(
		"arrow",
		member("export const f = (): void => {", "};\n"),
		1,
		"arrow/function expression",
	),
	longBody(
		"funcexpr",
		member("export const f = function (): void {", "};\n"),
		1,
		"arrow/function expression",
	),
	{
		path: "src/mut_method.ts",
		content:
			"export class A {\n\tm(o: { x: number }): void {\n\t\to.x = 1;\n\t}\n}\n",
		violation: {
			line: 3,
			message:
				"mutation of function parameter property is banned (copy it first)",
		},
	},
];

const mutationFixtures = [
	mutation("assign", ["o.x = 1;"]),
	mutation("compound", ["o.x += 1;"]),
	mutation("element", ['o["x"] = 1;']),
	mutation("increment", ["o.x++;"]),
	mutation("delete", ["delete o.x;"]),
	mutation("destructure", ["[o.x] = [1];"]),
	mutation("nested", ["[1].forEach(() => {", "\to.x = 1;", "});"], 3),
	{
		path: "src/ok_shadow.ts",
		content: inFunction("{", "\tconst o = { x: 0 };", "\to.x = 1;", "}"),
	},
	{
		path: "src/ok_rebind.ts",
		content:
			"export function f(n: number): number {\n\tconst l = { x: 0 };\n\tl.x = n;\n\tn = 2;\n\treturn l.x + n;\n}\n",
	},
];

const markers = [
	"@ts-ignore",
	"@ts-expect-error",
	"@ts-nocheck",
	"eslint-disable",
	"biome-ignore",
];

function banned(marker: string, line: number) {
	return { line, message: `suppression directive "${marker}" is banned` };
}

const suppressionFixtures: Fixture[] = [
	...markers.map((marker, i) => ({
		path: `src/sup_line_${i}.ts`,
		content: `// ${marker}\nexport const a = 1;\n`,
		violation: banned(marker, 1),
	})),
	...markers.map((marker, i) => ({
		path: `src/sup_block_${i}.ts`,
		content: `export const a = 1;\n/*\n ${marker}\n*/\n`,
		violation: banned(marker, 3),
	})),
	{
		path: "styles/sup_css.css",
		content: "/* biome-ignore lint: x */\na { }\n",
		violation: banned("biome-ignore", 1),
	},
	{
		path: "src/ok_escaped_quote.ts",
		content: "export const a = '\\' // @ts-ignore';\n",
	},
	{
		path: "src/ok_strings.ts",
		content:
			"export const a = ['// @ts-ignore', \"/* eslint-disable */\", `// biome-ignore`];\n",
	},
];

const tooManyParams = {
	line: 1,
	message: 'function "f" has 5 parameters (max 4)',
};

// One violating file per scan root and per script extension, so dropping
// any of them from the guard's lists leaves a fixture unreported.
const rootFixtures: Fixture[] = [
	...[
		"scripts/root_scripts.ts",
		"static/root_static.ts",
		"playwright.config.ts",
		"playwright.preview.config.ts",
		"vitest.config.ts",
	].map((path) => ({ path, content: params(5), violation: tooManyParams })),
	...["src/ext_js.js", "src/ext_mjs.mjs"].map((path) => ({
		path,
		content: "export function f(a, b, c, d, e) {}\n",
		violation: tooManyParams,
	})),
];

const fixtures: Fixture[] = [
	...lengthFixtures,
	...budgetFixtures,
	...kindFixtures,
	...mutationFixtures,
	...suppressionFixtures,
	...rootFixtures,
];

const dirs: string[] = [];

// Sequential on purpose: one process, one result, no scheduling variance.
function runGuardOver(set: Fixture[]): Run {
	const root = mkdtempSync(join(tmpdir(), "guard-"));
	dirs.push(root);
	for (const { path, content } of set) {
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
	const result = spawnSync(process.execPath, ["--import", loader, guard], {
		cwd: root,
		encoding: "utf8",
	});
	return { status: result.status, stderr: result.stderr };
}

let main: Run;
let passing: Run;

beforeAll(() => {
	// Given every fixture is seeded at its own path in a temp tree.

	// When the guard runs once over that tree.
	main = runGuardOver(fixtures);
	passing = runGuardOver(fixtures.filter((f) => f.violation === undefined));
});

afterAll(() => {
	for (const dir of dirs) {
		rmSync(dir, { recursive: true, force: true });
	}
});

const failing = fixtures.filter((f) => f.violation !== undefined);
const clean = fixtures.filter((f) => f.violation === undefined);

describe("guard run over all fixtures", () => {
	it("exits non-zero when any fixture violates a rule", () => {
		// Given the seeded fixtures include violations.

		// When the guard has run once over them.

		// Then the exit status is 1.
		expect(main.status).toBe(1);
	});

	it.each(failing)("reports $path with its exact message", (fixture) => {
		// Given the fixture was seeded in the shared tree with a known violation.
		const { line, message } = fixture.violation ?? { line: 0, message: "" };

		// When the guard has run once over the tree.

		// Then the guard printed that file, line and message.
		expect(main.stderr).toContain(`${fixture.path}:${line}: ${message}\n`);
	});

	it.each(clean)("does not report $path", (fixture) => {
		// Given the fixture sits at or inside its limit.

		// When the guard has run once over the tree.

		// Then no violation line names its path.
		expect(main.stderr).not.toContain(`${fixture.path}:`);
	});
});

describe("guard run over passing fixtures only", () => {
	it("exits zero when no fixture violates a rule", () => {
		// Given a tree seeded with only the fixtures at their limits.

		// When the guard has run over that tree.

		// Then the exit status is 0.
		expect(passing.status).toBe(0);

		// And nothing is reported.
		expect(passing.stderr).not.toContain("violation");
	});
});
