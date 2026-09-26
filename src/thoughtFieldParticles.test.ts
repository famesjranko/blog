import { describe, expect, it } from "vitest";
import type {
	Field,
	SloshFrame,
} from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
const SPREAD = 0.6;
const BASE_X = 0.5;
const BASE_Y = -0.25;
// Particle 0 is the smallest scale makePoints draws, particle 1 the largest.
const SCALES = [0.9, 1.8] as const;
// sloshWeight = 1 + spread * (scale - 1.35) / 0.45, worked by hand:
// 1 + 0.6 * -1 = 0.4 and 1 + 0.6 * 1 = 1.6.
const WEIGHTS = [0.4, 1.6] as const;
const STILL = { x: 0, y: 0, strength: 0 };
const NO_METEORS = { slots: [] };
const ORIGIN = { x: 0, y: 0 };
const NO_SLOSH: SloshFrame = { shift: ORIGIN, delta: ORIGIN, spread: SPREAD };

// Both particles rest at the same base with zero phases, so they differ
// only in scale.
function makeField(): Field {
	const count = SCALES.length;
	const base = new Float32Array(count * 3);
	for (let i = 0; i < count; i += 1) {
		base.set([BASE_X, BASE_Y, 0], i * 3);
	}
	return {
		count,
		palette: [],
		pos: base.slice(),
		col: new Float32Array(count * 3),
		base,
		phase: new Float32Array(count * 2),
		scale: Float32Array.from(SCALES),
	};
}

function step(field: Field, frame: number, slosh: SloshFrame): void {
	stepParticles({
		field,
		aspect: ASPECT,
		time: frame * FRAME,
		dt: FRAME,
		pointer: STILL,
		meteors: NO_METEORS,
		slosh,
	});
}

function coordinate(field: Field, index: number): number {
	return field.pos[index] ?? Number.NaN;
}

function offsets(sloshed: Field, plain: Field, axis: 0 | 1): number[] {
	return SCALES.map(
		(_, i) =>
			coordinate(sloshed, i * 3 + axis) - coordinate(plain, i * 3 + axis),
	);
}

describe("stepParticles slosh", () => {
	it("moves each particle by its weighted delta on a sudden shift", () => {
		const jolt = { x: 0.1, y: 0 };
		const sloshed = makeField();
		const plain = makeField();
		step(sloshed, 0, { shift: jolt, delta: jolt, spread: SPREAD });
		step(plain, 0, NO_SLOSH);
		const along = offsets(sloshed, plain, 0);
		expect(along[0]).toBeCloseTo(0.1 * WEIGHTS[0], 6);
		expect(along[1]).toBeCloseTo(0.1 * WEIGHTS[1], 6);
		expect(offsets(sloshed, plain, 1)).toEqual([0, 0]);
	});

	it("holds a steady lean against the drift ease", () => {
		const lean = { x: 0, y: 0.1 };
		const sloshed = makeField();
		const plain = makeField();
		const history: number[][] = [];
		for (let frame = 0; frame < 180; frame += 1) {
			const delta = frame === 0 ? lean : ORIGIN;
			step(sloshed, frame, { shift: lean, delta, spread: SPREAD });
			step(plain, frame, NO_SLOSH);
			history.push(offsets(sloshed, plain, 1));
		}
		const expected = WEIGHTS.map((w) => 0.1 * w);
		const drift = history.flatMap((pair) =>
			pair.map((offset, i) => Math.abs(offset - (expected[i] ?? Number.NaN))),
		);
		expect(Math.max(...drift)).toBeLessThan(1e-6);
	});

	it("leaves the drift untouched when there is no slosh", () => {
		const field = makeField();
		step(field, 0, NO_SLOSH);
		// At time 0 with zero phases the drift target is
		// (base.x * aspect + 0.05 cos 0, base.y + 0.09 cos 0).
		const ease = 1 - Math.exp(-FRAME * 1.1);
		const targetX = BASE_X * ASPECT + 0.05;
		const targetY = BASE_Y + 0.09;
		const x = Math.fround(BASE_X + (targetX - BASE_X) * ease);
		const y = Math.fround(BASE_Y + (targetY - BASE_Y) * ease);
		expect(Array.from(field.pos)).toEqual([x, y, 0, x, y, 0]);
	});
});
