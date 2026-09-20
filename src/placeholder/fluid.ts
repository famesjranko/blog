import {
	type Hsl,
	type Oklab,
	hexToRgb,
	hslToRgb,
	oklabToRgb,
	ramp,
	rgbToHsl,
	rgbToOklab,
} from "./colour.js";
import { makeNoise, makeRandom } from "./noise.js";

/**
 * Fluid-ink placeholder: domain-warped fractal noise mapped through a
 * five-stop ramp built from the site's cover photos. Pure: the same
 * slug and pool always produce the same pixels.
 */

export const PLACEHOLDER_WIDTH = 640;
export const PLACEHOLDER_HEIGHT = 360;

export interface RawImage {
	width: number;
	height: number;
	/** Packed 8-bit RGB, row-major. */
	data: Uint8Array;
}

/** Cover-photo accents the scheme draws from, as #rrggbb. */
export type Pool = readonly string[];

/**
 * Deep, anchor, second accent, pale, then a muted second accent. The
 * ramp runs deep → pale across the noise so every image spans the
 * full range of one cover colour and borrows one more.
 */
export function scheme(slug: string, pool: Pool): Oklab[] {
	if (pool.length === 0) {
		throw new Error("placeholder pool is empty");
	}
	const random = makeRandom(`${slug}:scheme`);
	const pick = (): Hsl => {
		const hex = pool[Math.floor(random() * pool.length)] ?? "#000000";
		return rgbToHsl(hexToRgb(hex));
	};
	const anchor = pick();
	const second = pick();
	const stops: Hsl[] = [
		{ h: anchor.h, s: Math.min(0.5, anchor.s), l: 0.14 },
		anchor,
		second,
		{ h: anchor.h + 20, s: Math.min(0.35, anchor.s), l: 0.86 },
		{ h: second.h, s: second.s * 0.6, l: 0.5 },
	];
	return stops.map((stop) => rgbToOklab(hslToRgb(stop)));
}

interface Warp {
	scale: number;
	offsetX: number;
	offsetY: number;
	strength: number;
}

function warpFor(random: () => number): Warp {
	return {
		scale: 1 / (220 + random() * 120),
		offsetX: random() * 100,
		offsetY: random() * 100,
		strength: 1.6 + random() * 1.2,
	};
}

/** Two rounds of domain warping, after Quilez, returning a ramp position. */
function sample(
	fbm: (x: number, y: number) => number,
	warp: Warp,
	x: number,
	y: number,
): number {
	const px = x * warp.scale + warp.offsetX;
	const py = y * warp.scale + warp.offsetY;
	const qx = fbm(px, py);
	const qy = fbm(px + 5.2, py + 1.3);
	const rx = fbm(px + warp.strength * qx + 1.7, py + warp.strength * qy + 9.2);
	const ry = fbm(px + warp.strength * qx + 8.3, py + warp.strength * qy + 2.8);
	return 0.5 + fbm(px + warp.strength * rx, py + warp.strength * ry) * 1.4;
}

export function renderFluid(slug: string, pool: Pool): RawImage {
	const stops = scheme(slug, pool);
	const random = makeRandom(`${slug}:fluid`);
	const noise = makeNoise(random);
	const warp = warpFor(random);
	const grain = makeRandom(`${slug}:grain`);
	const width = PLACEHOLDER_WIDTH;
	const height = PLACEHOLDER_HEIGHT;
	const data = new Uint8Array(width * height * 3);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const t = sample(noise.fbm, warp, x, y);
			const [L, a, b] = ramp(stops, t);
			const [r, g, bb] = oklabToRgb([L + (grain() - 0.5) * 0.025, a, b]);
			const offset = (y * width + x) * 3;
			data[offset] = r;
			data[offset + 1] = g;
			data[offset + 2] = bb;
		}
	}
	return { width, height, data };
}
