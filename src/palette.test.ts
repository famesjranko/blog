import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCssColour } from "../static/js/thought-field-maths.js";

// The site is designed dark first. These checks keep the light half of each
// light-dark() pair as readable as the dark half, so neither theme is the
// afterthought: WCAG AAA (7:1) for every text tone on both the page and the
// card/code surface, and the light ratio no more than 15% below the dark one.
const MIN_RATIO = 7;
// Diagram strokes are graphics, not text: WCAG non-text contrast is 3:1.
const MIN_GRAPHIC_RATIO = 3;
const MAX_LIGHT_DEFICIT = 0.15;

type Scheme = "light" | "dark";
type Palette = Map<string, Record<Scheme, string>>;

function readPalette(): Palette {
	const css = readFileSync("styles/main.css", "utf8");
	const pairs = css.matchAll(
		/--color-([a-z0-9-]+):\s*light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/gi,
	);
	return new Map(
		[...pairs].map(([, name = "", light = "", dark = ""]) => [
			name,
			{ light, dark },
		]),
	);
}

function token(name: string, scheme: Scheme): string {
	const pair = palette.get(name);
	if (pair === undefined) {
		throw new Error(`no light-dark() token --color-${name} in main.css`);
	}
	return pair[scheme];
}

function luminance(hex: string): number {
	const colour = parseCssColour(hex);
	if (colour === null) {
		throw new Error(`unparseable colour ${hex}`);
	}
	return 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b;
}

function contrast(a: string, b: string): number {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const palette = readPalette();
const TEXT_TOKENS = ["text", "muted", "accent"] as const;
const GRAPHIC_TOKENS = ["diagram-x", "diagram-o"] as const;
const GROUNDS = ["bg", "surface"] as const;
const SCHEMES = ["light", "dark"] as const;

describe("colour tokens", () => {
	it.each(TEXT_TOKENS)(
		"keeps %s at AAA contrast on every ground in both schemes",
		(name) => {
			for (const scheme of SCHEMES) {
				for (const ground of GROUNDS) {
					const ratio = contrast(token(name, scheme), token(ground, scheme));
					expect(
						ratio,
						`${name} on ${ground} in ${scheme}`,
					).toBeGreaterThanOrEqual(MIN_RATIO);
				}
			}
		},
	);

	it.each(TEXT_TOKENS)(
		"gives %s a light ratio close to its dark ratio",
		(name) => {
			const light = contrast(token(name, "light"), token("bg", "light"));
			const dark = contrast(token(name, "dark"), token("bg", "dark"));
			expect(light / dark, name).toBeGreaterThanOrEqual(1 - MAX_LIGHT_DEFICIT);
		},
	);

	it.each(GRAPHIC_TOKENS)(
		"keeps %s at non-text contrast on every ground in both schemes",
		(name) => {
			for (const scheme of SCHEMES) {
				for (const ground of GROUNDS) {
					const ratio = contrast(token(name, scheme), token(ground, scheme));
					expect(
						ratio,
						`${name} on ${ground} in ${scheme}`,
					).toBeGreaterThanOrEqual(MIN_GRAPHIC_RATIO);
				}
			}
		},
	);
});
