import { describe, expect, it } from "vitest";
import type {
	BirthStepOptions,
	BirthTuning,
} from "../static/js/thought-field-birth.js";
import { stepBirth } from "../static/js/thought-field-birth.js";

type Field = BirthStepOptions["field"];
type Point = readonly [number, number];
// When the particle starts condensing, then its haze offset on x and y.
type Seed = readonly [number, number, number];

const ASPECT = 1.5;
const FRAME = 1 / 60;
// Fixed here, so tuning the look of the site does not move the cases.
const TUNING: BirthTuning = { duration: 2, spread: 0.5, haze: 0.4, glow: 0.1 };

// With zero phases at time 0 the drift target is
// (base.x * aspect + 0.05, base.y + 0.09). POS starts on the bases, the
// unit square the field used to pop in as.
function makeField(bases: Point[]): Field {
	const base = Float32Array.from(bases.flatMap(([x, y]) => [x, y, 0]));
	return {
		count: bases.length,
		pos: base.slice(),
		alpha: new Float32Array(bases.length),
		base,
		phase: new Float32Array(bases.length * 2),
	};
}

function birth(field: Field, seeds: Seed[], age: number): boolean {
	return stepBirth({
		field,
		seeds: Float32Array.from(seeds.flat()),
		age,
		aspect: ASPECT,
		time: 0,
		tuning: TUNING,
	});
}

function targetOf([x, y]: Point): Point {
	return [x * ASPECT + 0.05, y + 0.09];
}

function posOf(field: Field, i: number): Point {
	return [field.pos[i * 3] ?? Number.NaN, field.pos[i * 3 + 1] ?? Number.NaN];
}

function distance(field: Field, i: number, base: Point): number {
	const [x, y] = posOf(field, i);
	const [tx, ty] = targetOf(base);
	return Math.hypot(x - tx, y - ty);
}

const BASES: Point[] = [
	[0.05, 0.02],
	[0.9, 0.8],
	[-0.7, 0.3],
	[-0.4, -0.95],
];
const SEEDS: Seed[] = [
	[0, 0, 0.99],
	[0.3, 0.8, 0.1],
	[0.6, 0.45, 0.5],
	[0.99, 0.2, 0.7],
];

describe("stepBirth start and hand-off", () => {
	it("starts every particle faint in the haze about its target", () => {
		const field = makeField(BASES);
		birth(field, SEEDS, 0);
		BASES.forEach((base, i) => {
			const [x, y] = posOf(field, i);
			const [tx, ty] = targetOf(base);
			expect(field.alpha[i]).toBeCloseTo(TUNING.glow, 6);
			expect(Math.abs(x - tx)).toBeLessThanOrEqual(TUNING.haze + 1e-6);
			expect(Math.abs(y - ty)).toBeLessThanOrEqual(TUNING.haze + 1e-6);
		});
		// Seed x of 0 is the far edge of the haze.
		expect(distance(field, 0, BASES[0] ?? [0, 0])).toBeGreaterThan(0.3);
	});

	it("hands each particle to the drift on its target at full alpha", () => {
		const field = makeField(BASES);
		const nowhere: Point = [Number.NaN, Number.NaN];
		const last = BASES.map(() => ({ at: nowhere, alpha: 0 }));
		for (let frame = 0; frame * FRAME <= TUNING.duration; frame += 1) {
			// The birth leaves a handed-over particle's position alone, so
			// only its own writes replace the NaN.
			field.pos.fill(Number.NaN);
			birth(field, SEEDS, frame * FRAME);
			BASES.forEach((_, i) => {
				const at = posOf(field, i);
				if (!Number.isNaN(at[0])) {
					last[i] = { at, alpha: field.alpha[i] ?? 0 };
				}
			});
		}
		BASES.forEach((base, i) => {
			const [x, y] = targetOf(base);
			expect(last[i]?.at[0]).toBeCloseTo(x, 4);
			expect(last[i]?.at[1]).toBeCloseTo(y, 4);
			expect(last[i]?.alpha).toBeGreaterThan(0.99);
		});
	});

	it("reveals every particle and reports the end at its duration", () => {
		const field = makeField(BASES);
		expect(birth(field, SEEDS, TUNING.duration - FRAME)).toBe(true);
		expect(birth(field, SEEDS, TUNING.duration)).toBe(false);
		expect(Array.from(field.alpha)).toEqual(BASES.map(() => 1));
	});
});

describe("stepBirth condensing", () => {
	const base: Point = [0.5, 0.3];

	it("draws a particle in toward its target as it brightens", () => {
		const field = makeField([base]);
		const seen = [0.2, 0.5, 0.8].map((age) => {
			birth(field, [[0, 0, 0]], age);
			return { gap: distance(field, 0, base), alpha: field.alpha[0] ?? 0 };
		});
		const [early, mid, late] = seen;
		expect(mid?.gap).toBeLessThan(early?.gap ?? 0);
		expect(late?.gap).toBeLessThan(mid?.gap ?? 0);
		expect(late?.alpha).toBeGreaterThan(early?.alpha ?? 1);
	});

	it("starts brightening as soon as a particle starts condensing", () => {
		const field = makeField([base]);
		// 5% of its 1 s span after it starts.
		birth(field, [[0, 0, 0]], 0.05);
		expect(field.alpha[0]).toBeGreaterThan(TUNING.glow + 0.05);
	});

	it("holds a later-starting particle in the haze longer", () => {
		const field = makeField([base, base]);
		birth(
			field,
			[
				[0, 0, 0],
				[0.99, 0, 0],
			],
			0.5,
		);
		expect(field.alpha[1]).toBeCloseTo(TUNING.glow, 6);
		expect(field.alpha[0]).toBeGreaterThan(TUNING.glow + 0.1);
		expect(distance(field, 0, base)).toBeLessThan(distance(field, 1, base));
	});
});
