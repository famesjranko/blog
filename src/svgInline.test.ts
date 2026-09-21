import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inlineSvg } from "./svgInline.js";

const EULER = "/img/essays/dretske-closure/euler-diagram.svg";
const BOARD = "/img/projects/connect4-heuristic/connect4-depth1.svg";

const DIAGRAM = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" class="diagram" viewBox="0 0 10 10" role="img" aria-labelledby="title desc">
  <title id="title">T</title><desc id="desc">D</desc>
  <defs><filter id="glow"/></defs>
  <a href="#outside">x</a>
  <circle filter="url(#glow)" r="1"/>
</svg>`;

/** A fresh root holding `static/<rel>` plus one SVG *outside* static. */
function tempRoot(rel: string, content: string): string {
	const dir = mkdtempSync(path.join(tmpdir(), "svg-inline-"));
	const file = path.join(dir, "static", rel);
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, content);
	writeFileSync(path.join(dir, "escaped.svg"), DIAGRAM);
	return path.join(dir, "static");
}

describe("inlineSvg on shipped diagrams", () => {
	it("inlines the euler diagram with its shipped size and no XML declaration", () => {
		const svg = inlineSvg(EULER);
		expect(svg?.startsWith("<svg")).toBe(true);
		expect(svg).not.toContain("<?xml");
		expect(svg?.match(/width="376"/g)).toHaveLength(1);
		expect(svg?.match(/height="376"/g)).toHaveLength(1);
	});

	it("namespaces defined ids and every reference to them", () => {
		const svg = inlineSvg(BOARD) ?? "";
		const prefix = /id="(svg-[0-9a-f]{8}-)soft-glow"/.exec(svg)?.[1];
		expect(prefix).toBeDefined();
		expect(svg).toContain(`url(#${prefix}soft-glow)`);
		expect(svg).not.toMatch(/[#"]soft-glow[")]/);
		expect(svg).toContain(
			`aria-labelledby="${prefix}title-depth-1 ${prefix}desc-depth-1"`,
		);
	});

	it("is deterministic across calls", () => {
		expect(inlineSvg(BOARD)).toBe(inlineSvg(BOARD));
	});
});

describe("inlineSvg boundaries", () => {
	it("returns undefined for sources that are not internal svgs", () => {
		expect(inlineSvg("https://example.com/d.svg")).toBeUndefined();
		expect(inlineSvg("//cdn.example.com/d.svg")).toBeUndefined();
		expect(inlineSvg("img/d.svg")).toBeUndefined();
		expect(inlineSvg("/img/essays/x/cover.jpg")).toBeUndefined();
		expect(inlineSvg("/img/essays/x/missing.svg")).toBeUndefined();
	});

	it("refuses a path that resolves outside the static root", () => {
		const root = tempRoot("img/d.svg", DIAGRAM);
		expect(inlineSvg("/img/d.svg", root)).toBeDefined();
		expect(inlineSvg("/img/../../escaped.svg", root)).toBeUndefined();
		expect(inlineSvg("/../escaped.svg", root)).toBeUndefined();
	});

	it("leaves an svg without the diagram class to the img path", () => {
		const root = tempRoot(
			"img/logo.svg",
			DIAGRAM.replace('class="diagram"', 'class="logo"'),
		);
		expect(inlineSvg("/img/logo.svg", root)).toBeUndefined();
	});

	it("does not rewrite references to ids the file does not define", () => {
		const root = tempRoot("img/d.svg", DIAGRAM);
		const svg = inlineSvg("/img/d.svg", root) ?? "";
		expect(svg).toContain('href="#outside"');
		expect(svg).toMatch(/filter="url\(#svg-[0-9a-f]{8}-glow\)"/);
	});

	it("gives files with the same basename in different directories different prefixes", () => {
		const root = tempRoot("img/a/d.svg", DIAGRAM);
		writeFileSync(path.join(root, "img", "b.svg"), "");
		mkdirSync(path.join(root, "img", "b"));
		writeFileSync(path.join(root, "img", "b", "d.svg"), DIAGRAM);
		const a = /id="(svg-[0-9a-f]{8}-)title"/.exec(
			inlineSvg("/img/a/d.svg", root) ?? "",
		)?.[1];
		const b = /id="(svg-[0-9a-f]{8}-)title"/.exec(
			inlineSvg("/img/b/d.svg", root) ?? "",
		)?.[1];
		expect(a).toBeDefined();
		expect(b).toBeDefined();
		expect(a).not.toBe(b);
	});
});
