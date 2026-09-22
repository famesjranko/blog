import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The diagram contract: an SVG opting in with class="diagram" is inlined
// at build time and takes every colour from the site palette via
// styles/diagrams.css, while its surrounding layout comes from figures.css.
// It must carry no presentation of its own, and it
// owns its accessible name because the markdown alt is dropped.
const CONTENT_DIAGRAMS = [
	"static/img/essays/dretske-closure/euler-diagram.svg",
	"static/img/projects/connect4-heuristic/connect4-depth1.svg",
	"static/img/projects/connect4-heuristic/connect4-depth2.svg",
	"static/img/projects/connect4-heuristic/connect4-depth3.svg",
	"static/img/projects/connect4-heuristic/connect4-depth4.svg",
];

const ROOT_TAG = /<svg\b[^>]*>/;
const COLOUR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i;

function rootTag(svg: string): string {
	return ROOT_TAG.exec(svg)?.[0] ?? "";
}

function isDiagram(svg: string): boolean {
	const classes = /\bclass="([^"]*)"/.exec(rootTag(svg))?.[1] ?? "";
	return classes.split(/\s+/).includes("diagram");
}

const diagrams = readdirSync("static/img", { recursive: true })
	.map(String)
	.filter((name) => name.endsWith(".svg"))
	.map((name) => path.join("static/img", name).split(path.sep).join("/"))
	.map((file) => ({ file, svg: readFileSync(file, "utf8") }))
	.filter(({ svg }) => isDiagram(svg));

describe("diagram svgs", () => {
	it("include every content diagram, so the guard cannot be dodged", () => {
		expect(diagrams.map(({ file }) => file).sort()).toEqual(
			expect.arrayContaining(CONTENT_DIAGRAMS),
		);
	});

	it.each(diagrams)("$file carries no presentation of its own", ({ svg }) => {
		expect(svg).not.toMatch(/<style\b/);
		expect(svg).not.toMatch(/\bstyle="/);
		expect(svg).not.toMatch(COLOUR_LITERAL);
	});

	it.each(diagrams)("$file scales from a viewBox", ({ svg }) => {
		expect(rootTag(svg)).toMatch(/\bviewBox="/);
	});

	it.each(diagrams)(
		"$file names itself for assistive technology",
		({ svg }) => {
			const root = rootTag(svg);
			expect(root).toMatch(/\brole="img"/);
			const ids = (/\baria-labelledby="([^"]*)"/.exec(root)?.[1] ?? "")
				.split(/\s+/)
				.filter(Boolean);
			expect(ids.length).toBeGreaterThan(0);
			for (const id of ids) {
				expect(svg, id).toMatch(
					new RegExp(`<(title|desc)\\b[^>]*\\bid="${id}"`),
				);
			}
			const [first = ""] = ids;
			expect(svg).toMatch(new RegExp(`<title\\b[^>]*\\bid="${first}"`));
		},
	);
});
