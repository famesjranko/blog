import { describe, expect, it } from "vitest";
import type { Field } from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
const BASE_X = 0.5;
const BASE_Y = -0.25;
const STILL = { x: 0, y: 0, strength: 0 };
const NO_METEORS = { slots: [] };

// Two particles resting at the same base with zero phases.
function makeField(): Field {
	const count = 2;
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
		scale: Float32Array.from([0.9, 1.8]),
	};
}

function step(field: Field, hold: number): void {
	stepParticles({
		field,
		aspect: ASPECT,
		time: 0,
		dt: FRAME,
		pointer: STILL,
		meteors: NO_METEORS,
		hold,
	});
}

describe("stepParticles hold", () => {
	it("leaves the drift untouched at full hold", () => {
		const field = makeField();
		step(field, 1);
		// At time 0 with zero phases the drift target is
		// (base.x * aspect + 0.05 cos 0, base.y + 0.09 cos 0).
		const ease = 1 - Math.exp(-FRAME * 1.1);
		const targetX = BASE_X * ASPECT + 0.05;
		const targetY = BASE_Y + 0.09;
		const x = Math.fround(BASE_X + (targetX - BASE_X) * ease);
		const y = Math.fround(BASE_Y + (targetY - BASE_Y) * ease);
		expect(Array.from(field.pos)).toEqual([x, y, 0, x, y, 0]);
	});

	it("stops pulling particles home at zero hold", () => {
		const field = makeField();
		const before = Array.from(field.pos);
		step(field, 0);
		expect(Array.from(field.pos)).toEqual(before);
	});
});
