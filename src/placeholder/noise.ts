/**
 * Seeded randomness and gradient noise for the placeholder renderer.
 * Everything here is deterministic for a given seed string, which is
 * what makes a placeholder reproducible from its slug alone.
 */

/** FNV-1a, the same hash the site used for the old CSS placeholders. */
export function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** xorshift32 over the seed hash: uniform numbers in [0, 1). */
export function makeRandom(seed: string): () => number {
	let state = hashSeed(seed) || 1;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 4294967296;
	};
}

const GRADIENTS: ReadonlyArray<readonly [number, number]> = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[Math.SQRT1_2, Math.SQRT1_2],
	[-Math.SQRT1_2, Math.SQRT1_2],
	[Math.SQRT1_2, -Math.SQRT1_2],
	[-Math.SQRT1_2, -Math.SQRT1_2],
];

function fade(t: number): number {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function shuffledPermutation(random: () => number): number[] {
	const table = Array.from({ length: 256 }, (_, index) => index);
	for (let index = 255; index > 0; index -= 1) {
		const swap = Math.floor(random() * (index + 1));
		const a = table[index] ?? 0;
		const b = table[swap] ?? 0;
		table[index] = b;
		table[swap] = a;
	}
	return table;
}

export interface Noise {
	/** Perlin gradient noise, roughly in -0.7..0.7. */
	at: (x: number, y: number) => number;
	/** Fractal sum of `octaves` noise layers, roughly in -1..1. */
	fbm: (x: number, y: number, octaves?: number) => number;
}

export function makeNoise(random: () => number): Noise {
	const perm = shuffledPermutation(random);
	const lookup = (index: number): number => perm[index & 255] ?? 0;
	const dot = (ix: number, iy: number, x: number, y: number): number => {
		const gradient = GRADIENTS[lookup(ix + lookup(iy)) & 7] ?? GRADIENTS[0];
		if (gradient === undefined) {
			return 0;
		}
		return gradient[0] * (x - ix) + gradient[1] * (y - iy);
	};
	const at = (x: number, y: number): number => {
		const x0 = Math.floor(x);
		const y0 = Math.floor(y);
		const sx = fade(x - x0);
		const sy = fade(y - y0);
		const top =
			dot(x0, y0, x, y) + sx * (dot(x0 + 1, y0, x, y) - dot(x0, y0, x, y));
		const bottom =
			dot(x0, y0 + 1, x, y) +
			sx * (dot(x0 + 1, y0 + 1, x, y) - dot(x0, y0 + 1, x, y));
		return top + sy * (bottom - top);
	};
	const fbm = (x: number, y: number, octaves = 5): number => {
		let value = 0;
		let amplitude = 0.5;
		let frequency = 1;
		for (let octave = 0; octave < octaves; octave += 1) {
			value += amplitude * at(x * frequency, y * frequency);
			amplitude *= 0.5;
			frequency *= 2;
		}
		return value;
	};
	return { at, fbm };
}
