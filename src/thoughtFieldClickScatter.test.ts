import { expect, it } from "vitest";
import { effect } from "../static/js/thought-field-click-scatter.js";

const event = {
	x: 0,
	y: 0,
	age: 0,
	strength: 1,
	mode: "scatter",
};
const frame = { event, dt: 1 / 60, aspect: 1.5 };

it("pushes a nearby particle outward on the first frame", () => {
	// Given a particle near the click on its first frame.
	const options = { ...frame, x: 0.1, y: 0.1 };

	// When the scatter acts.
	const moved = effect(options);

	// Then the particle moves away from the click on both axes.
	expect(moved.x).toBeGreaterThan(0);
	expect(moved.y).toBeGreaterThan(0);
});

it("leaves particles outside the bounded area still", () => {
	// Given particles inside and outside the scatter area.
	const near = { ...frame, x: 0.2, y: 0 };
	const far = { ...frame, x: 0.5, y: 0 };

	// When the scatter acts on each particle.
	const nearMove = effect(near);
	const farMove = effect(far);

	// Then only the nearby particle moves.
	expect(nearMove.x).toBeGreaterThan(0);
	expect(farMove).toEqual({ x: 0, y: 0 });
});

it("ends its impulse and leaves the field to drift", () => {
	// Given a nearby particle and a click past its short lifetime.
	const options = {
		...frame,
		x: -0.1,
		y: 0,
		event: { ...event, age: 0.2 },
	};

	// When the old scatter is evaluated.
	const moved = effect(options);

	// Then it contributes no displacement.
	expect(moved).toEqual({ x: 0, y: 0 });
});

it("keeps invalid input finite", () => {
	// Given an invalid click strength.
	const options = {
		...frame,
		x: 0.1,
		y: 0,
		event: { ...event, strength: Number.NaN },
	};

	// When the scatter is evaluated.
	const moved = effect(options);

	// Then it contributes no invalid displacement.
	expect(moved).toEqual({ x: 0, y: 0 });
});
