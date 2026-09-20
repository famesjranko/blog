/**
 * Colour maths for the placeholder renderer. Blends happen in OKLab so
 * a mix of two cover colours never collapses into grey the way a naive
 * sRGB average does.
 */

/** Perceptual colour: lightness plus two opponent axes. */
export type Oklab = readonly [number, number, number];

/** 8-bit sRGB triple, the form an image buffer wants. */
export type Rgb = readonly [number, number, number];

export interface Hsl {
	h: number;
	s: number;
	l: number;
}

function srgbToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
	return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

export function hexToRgb(hex: string): Rgb {
	const match = HEX.exec(hex);
	if (match === null) {
		throw new Error(`not a #rrggbb colour: ${hex}`);
	}
	const [, r = "0", g = "0", b = "0"] = match;
	return [
		Number.parseInt(r, 16),
		Number.parseInt(g, 16),
		Number.parseInt(b, 16),
	];
}

export function rgbToHex([r, g, b]: Rgb): string {
	const pair = (v: number): string => v.toString(16).padStart(2, "0");
	return `#${pair(r)}${pair(g)}${pair(b)}`;
}

export function rgbToOklab([r8, g8, b8]: Rgb): Oklab {
	const r = srgbToLinear(r8 / 255);
	const g = srgbToLinear(g8 / 255);
	const b = srgbToLinear(b8 / 255);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function clampByte(linear: number): number {
	const clamped = Math.max(0, Math.min(1, linear));
	return Math.max(0, Math.min(255, Math.round(linearToSrgb(clamped) * 255)));
}

export function oklabToRgb([L, a, b]: Oklab): Rgb {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		clampByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
		clampByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
		clampByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
	];
}

export function rgbToHsl([r8, g8, b8]: Rgb): Hsl {
	const r = r8 / 255;
	const g = g8 / 255;
	const b = b8 / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) {
		return { h: 0, s: 0, l };
	}
	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h =
		max === r
			? (g - b) / d + (g < b ? 6 : 0)
			: max === g
				? (b - r) / d + 2
				: (r - g) / d + 4;
	return { h: h * 60, s, l };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const channel = (n: number): number => {
		const k = (n + h / 30) % 12;
		const a = s * Math.min(l, 1 - l);
		return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
	};
	return [channel(0), channel(8), channel(4)];
}

/**
 * Sample a multi-stop ramp at `t` in 0..1, interpolating linearly in
 * OKLab between neighbouring stops. Out-of-range `t` clamps.
 */
export function ramp(stops: readonly Oklab[], t: number): Oklab {
	const last = stops.length - 1;
	const position = Math.max(0, Math.min(0.999999, t)) * last;
	const index = Math.floor(position);
	const fraction = position - index;
	const from = stops[index] ?? stops[0];
	const to = stops[index + 1] ?? from;
	if (from === undefined || to === undefined) {
		throw new Error("ramp needs at least one stop");
	}
	return [
		from[0] + (to[0] - from[0]) * fraction,
		from[1] + (to[1] - from[1]) * fraction,
		from[2] + (to[2] - from[2]) * fraction,
	];
}
