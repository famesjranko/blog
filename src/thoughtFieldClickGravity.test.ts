import { describe, expect, it } from "vitest";
import { effect } from "../static/js/thought-field-click-gravity.js";

const at = (mode: string, age = 0, x = 0.4, y = 0) =>
	effect({
		x,
		y,
		event: { x: 0, y: 0, age, strength: 1, mode },
		dt: 1 / 60,
		aspect: 1.8,
	});

describe("gravity click displacement", () => {
	it("pulls nearby particles sharply during the brief implosion", () => {
		// Given a particle to the right of a new implosion.
		const mode = "gravity-implosion";

		// When one frame of force is applied.
		const displacement = at(mode);

		// Then the particle moves toward the click without crossing it.
		expect(displacement.x).toBeLessThan(-0.01);
		expect(displacement.x).toBeGreaterThan(-0.4);
		expect(displacement.y).toBe(0);
	});

	it("pulls more gently for longer in slow mode", () => {
		// Given a particle near a click that is one second old.
		const age = 1;

		// When both tunings are sampled at that age.
		const slow = at("gravity-slow", age);
		const implosion = at("gravity-implosion", age);
		const freshSlow = at("gravity-slow");
		const freshImplosion = at("gravity-implosion");

		// Then the slow pull starts softer and remains after the implosion ends.
		expect(Math.abs(freshSlow.x)).toBeLessThan(Math.abs(freshImplosion.x));
		expect(slow.x).toBeLessThan(-0.001);
		expect(implosion).toStrictEqual({ x: 0, y: 0 });
	});
});

describe("gravity force limits", () => {
	it("stays finite at the centre and pulls symmetrically nearby", () => {
		// Given the centre and two particles on opposite sides of it.
		const centre = at("gravity-implosion", 0, 0, 0);

		// When the force is sampled on both sides.
		const right = at("gravity-implosion", 0, 0.2, 0);
		const left = at("gravity-implosion", 0, -0.2, 0);

		// Then the centre is stationary and the two sides pull inward equally.
		expect(centre).toStrictEqual({ x: 0, y: 0 });
		expect(Number.isFinite(centre.x) && Number.isFinite(centre.y)).toBe(true);
		expect(right.x).toBeCloseTo(-left.x, 12);
		expect(right.x).toBeLessThan(0);
	});

	it("weakens with distance and age, then returns to plain drift", () => {
		// Given particles near and far from a slow click.
		const mode = "gravity-slow";

		// When their early and late displacements are sampled.
		const near = at(mode, 0, 0.4);
		const far = at(mode, 0, 2.4);
		const late = at(mode, 2, 0.4);
		const expired = at(mode, 2.4, 0.4);

		// Then the pull fades in space and time and finally stops.
		expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
		expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(late.x));
		expect(expired).toStrictEqual({ x: 0, y: 0 });
	});
});

describe("gravity input boundaries", () => {
	it("ignores invalid or unreachable field positions", () => {
		// Given an ordinary slow click and values outside the finite field.
		const event = {
			x: 0,
			y: 0,
			age: 0,
			strength: 1,
			mode: "gravity-slow",
		};

		// When a particle position or frame duration cannot give a valid step.
		const extreme = effect({ x: 1e308, y: 0, event, dt: 1 / 60, aspect: 1.8 });
		const paused = effect({ x: 0.4, y: 0, event, dt: 0, aspect: 1.8 });

		// Then no invalid displacement reaches the particle buffer.
		expect(extreme).toStrictEqual({ x: 0, y: 0 });
		expect(paused).toStrictEqual({ x: 0, y: 0 });
	});
});
