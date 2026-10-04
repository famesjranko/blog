import { describe, expect, it, vi } from "vitest";
import type { Orbit } from "../static/js/thought-field-orbit.js";
import { createOrbit } from "../static/js/thought-field-orbit.js";
import type { Field, Pointer } from "../static/js/thought-field-particles.js";

// The frame module has no hand-written types; restate the slice used.
type FrameOptions = {
	renderer: { render: () => void };
	field: Field;
	pointer: Pointer;
	hero: null;
	meteors: { slots: [] };
	dims: { aspect: number };
	motion: null;
	orbit: Orbit;
};
type FrameState = {
	physics: null;
	growth: { age: number; growing: boolean; seeds: Float32Array };
};
const { renderFrame } = await vi.importActual<{
	renderFrame: (
		options: FrameOptions,
		now: number,
		dt: number,
		state: FrameState,
	) => FrameState;
}>("../static/js/thought-field-frame.js");

const NOW = 5000;
const DT = 1 / 60;

// One particle at rest at (0.25, 0) with zero phases.
function oneParticle(): Field {
	return {
		count: 1,
		palette: [],
		pos: Float32Array.from([0.25, 0, 0]),
		alpha: new Float32Array(1),
		col: new Float32Array(3),
		base: Float32Array.from([0.25, 0, 0]),
		phase: new Float32Array(2),
		scale: Float32Array.from([1]),
	};
}

// Runs one frame with the pointer just moved, far from the particle so
// hover repulsion does not move it.
function frame(orbit: Orbit) {
	const field = oneParticle();
	const pointer = { x: 9, y: 9, strength: 0, lastMove: NOW };
	const options: FrameOptions = {
		renderer: { render: () => {} },
		field,
		pointer,
		hero: null,
		meteors: { slots: [] },
		dims: { aspect: 1 },
		motion: null,
		orbit,
	};
	renderFrame(options, NOW, DT, {
		physics: null,
		growth: { age: 0, growing: false, seeds: new Float32Array(1) },
	});
	return { y: field.pos[1] ?? 0, hover: pointer.strength };
}

describe("orbit in the frame", () => {
	it("turns a particle clockwise while the pointer is held", () => {
		// Given one frame with no press, for the plain drift and hover
		const plain = frame(createOrbit());
		// And an orbit held at the origin
		const held = createOrbit();
		held.press(0, 0, 1);

		// When the same frame runs with the hold
		const turned = frame(held);

		// Then the particle right of the press point ends lower
		expect(turned.y).toBeLessThan(plain.y);
	});

	it("gives hover repulsion no strength while the pointer is held", () => {
		// Given an orbit held at the origin
		const orbit = createOrbit();
		orbit.press(0, 0, 1);

		// When a frame runs just after a pointer move
		const { hover } = frame(orbit);

		// Then hover repulsion is paused
		expect(hover).toBe(0);
	});

	it("keeps full hover repulsion when nothing is held", () => {
		// Given an orbit with no press
		const orbit = createOrbit();

		// When a frame runs just after a pointer move
		const { hover } = frame(orbit);

		// Then hover repulsion is whole
		expect(hover).toBe(1);
	});
});
