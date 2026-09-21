import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { imageSize } from "./images.js";

/**
 * Build-time inlining for theme-aware diagrams. An SVG whose root carries
 * the `diagram` class is embedded in the page so its classes pick up the
 * site palette (an `<img>`-loaded SVG follows the OS scheme, not the
 * toggle). Every other SVG keeps the ordinary `<img>` path.
 */

const ROOT_TAG = /<svg\b[^>]*>/;
const XML_DECLARATION = /^\s*<\?xml[^>]*\?>\s*/;
const CLASS_ATTR = /\bclass="([^"]*)"/;
const ID_ATTR = /\bid="([^"]+)"/g;
const ID_REFERENCE = /\b(?:xlink:)?href="#([^"]+)"|url\(#([^)]+)\)/g;
const ARIA_ID_LIST = /\b(aria-labelledby|aria-describedby)="([^"]*)"/g;

const cache = new Map<string, string | undefined>();

/** Absolute file path for a root-relative source, or undefined when it
 * is not an internal `.svg` or would escape `root`. */
function resolveUnder(root: string, src: string): string | undefined {
	if (!src.startsWith("/") || src.startsWith("//")) {
		return undefined;
	}
	if (!src.toLowerCase().endsWith(".svg")) {
		return undefined;
	}
	const base = path.resolve(root);
	const candidate = path.resolve(base, `.${src}`);
	if (!candidate.startsWith(base + path.sep)) {
		return undefined;
	}
	return candidate;
}

function readSvg(file: string): string | undefined {
	try {
		return readFileSync(file, "utf8");
	} catch {
		return undefined;
	}
}

function isDiagram(rootTag: string): boolean {
	const classes = CLASS_ATTR.exec(rootTag)?.[1] ?? "";
	return classes.split(/\s+/).includes("diagram");
}

/** Prefix every id the file defines, and every reference to one, so
 * several inline SVGs share a document without colliding. */
function namespaceIds(svg: string, prefix: string): string {
	const defined = new Set([...svg.matchAll(ID_ATTR)].map(([, id]) => id));
	const rename = (id: string): string =>
		defined.has(id) ? `${prefix}${id}` : id;
	return svg
		.replace(ID_ATTR, (_, id: string) => `id="${rename(id)}"`)
		.replace(ID_REFERENCE, (match, href?: string, url?: string) =>
			href !== undefined
				? match.replace(`#${href}`, `#${rename(href)}`)
				: `url(#${rename(url ?? "")})`,
		)
		.replace(
			ARIA_ID_LIST,
			(_, name: string, ids: string) =>
				`${name}="${ids.split(/\s+/).filter(Boolean).map(rename).join(" ")}"`,
		);
}

/** Replace any authored width/height on the root with the shipped
 * pixel size so the layout reserves the same box an <img> would. */
function withSize(svg: string, src: string): string {
	const size = imageSize(src);
	const rootTag = ROOT_TAG.exec(svg)?.[0];
	if (size === undefined || rootTag === undefined) {
		return svg;
	}
	const stripped = rootTag.replace(/\s+(?:width|height)="[^"]*"/g, "");
	const sized = stripped.replace(
		/>$/,
		` width="${size.width}" height="${size.height}">`,
	);
	return svg.replace(rootTag, sized);
}

function idPrefix(src: string): string {
	return `svg-${createHash("sha256").update(src).digest("hex").slice(0, 8)}-`;
}

function inlineUncached(src: string, root: string): string | undefined {
	const file = resolveUnder(root, src);
	const raw = file === undefined ? undefined : readSvg(file);
	if (raw === undefined) {
		return undefined;
	}
	const svg = raw.replace(XML_DECLARATION, "");
	const rootTag = ROOT_TAG.exec(svg)?.[0];
	if (rootTag === undefined || !isDiagram(rootTag)) {
		return undefined;
	}
	return withSize(namespaceIds(svg, idPrefix(src)), src).trim();
}

/**
 * Inline markup for a diagram SVG at a root-relative site path, or
 * `undefined` when the source is external, relative, missing, outside
 * `root`, not an SVG, or not opted into the diagram contract.
 */
export function inlineSvg(src: string, root = "static"): string | undefined {
	const key = `${root}\u0000${src}`;
	if (!cache.has(key)) {
		cache.set(key, inlineUncached(src, root));
	}
	return cache.get(key);
}
