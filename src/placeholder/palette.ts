import { type Rgb, rgbToHex, rgbToHsl } from "./colour.js";

/**
 * Dominant-colour extraction for the placeholder pool. k-means over a
 * thumbnail's pixels, seeded so the same covers always yield the same
 * pool and therefore the same placeholders.
 */

const ROUNDS = 12;

/** Accent thresholds: saturated enough to read as colour, mid-toned. */
const MIN_SATURATION = 0.18;
const MIN_LIGHTNESS = 0.15;
const MAX_LIGHTNESS = 0.75;

function nearest(centres: readonly Rgb[], pixel: Rgb): number {
	let best = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	centres.forEach((centre, index) => {
		const distance =
			(centre[0] - pixel[0]) ** 2 +
			(centre[1] - pixel[1]) ** 2 +
			(centre[2] - pixel[2]) ** 2;
		if (distance < bestDistance) {
			bestDistance = distance;
			best = index;
		}
	});
	return best;
}

function mean(members: readonly Rgb[], fallback: Rgb): Rgb {
	if (members.length === 0) {
		return fallback;
	}
	const sum = members.reduce<[number, number, number]>(
		(acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b],
		[0, 0, 0],
	);
	return [
		Math.round(sum[0] / members.length),
		Math.round(sum[1] / members.length),
		Math.round(sum[2] / members.length),
	];
}

/**
 * Cluster `pixels` into `k` centres, largest cluster first. `random`
 * seeds the initial centres, so the result is reproducible.
 */
export function kmeans(
	pixels: readonly Rgb[],
	k: number,
	random: () => number,
): Rgb[] {
	if (pixels.length === 0) {
		return [];
	}
	const black: Rgb = [0, 0, 0];
	let centres: Rgb[] = Array.from(
		{ length: k },
		() => pixels[Math.floor(random() * pixels.length)] ?? black,
	);
	let members: Rgb[][] = [];
	for (let round = 0; round < ROUNDS; round += 1) {
		members = centres.map(() => []);
		for (const pixel of pixels) {
			members[nearest(centres, pixel)]?.push(pixel);
		}
		centres = centres.map((centre, index) =>
			mean(members[index] ?? [], centre),
		);
	}
	return centres
		.map((centre, index) => ({ centre, size: members[index]?.length ?? 0 }))
		.sort((a, b) => b.size - a.size)
		.map((entry) => entry.centre);
}

/** The colours in `centres` that qualify as accents, as #rrggbb. */
export function accents(centres: readonly Rgb[]): string[] {
	return centres
		.filter((rgb) => {
			const { s, l } = rgbToHsl(rgb);
			return s > MIN_SATURATION && l > MIN_LIGHTNESS && l < MAX_LIGHTNESS;
		})
		.map(rgbToHex);
}

/** Unpack a packed RGB(A) buffer into pixel triples. */
export function pixelsOf(data: Uint8Array, channels: number): Rgb[] {
	const pixels: Rgb[] = [];
	for (let offset = 0; offset + 2 < data.length; offset += channels) {
		pixels.push([
			data[offset] ?? 0,
			data[offset + 1] ?? 0,
			data[offset + 2] ?? 0,
		]);
	}
	return pixels;
}
