import { expect, it } from "vitest";
import { effect } from "../static/js/thought-field-click-shockwave.js";

const event = { x: 0, y: 0, age: 0.5, strength: 1, mode: "shockwave" };
const frame = { event, dt: 1 / 60, aspect: 2 };

it("reaches a particle only after the front travels to its radius", () => {
	// Given a particle 0.85 field units from the click.
	const particle = { x: 0.85, y: 0 };

	// When the event is young and when its front reaches the particle.
	const early = effect({
		...frame,
		...particle,
		event: { ...event, age: 0.2 },
	});
	const arrived = effect({ ...frame, ...particle });

	// Then only the arriving front moves the particle outward.
	expect(early).toEqual({ x: 0, y: 0 });
	expect(arrived.x).toBeGreaterThan(0);
	expect(arrived.y).toBe(0);
});

it("acts near its front and leaves distant particles still", () => {
	// Given three particles inside, on, and outside the passing front.
	const inside = { x: 0.4, y: 0 };
	const onFront = { x: 0.85, y: 0 };
	const outside = { x: 1.3, y: 0 };

	// When the ring reaches the middle particle.
	const near = effect({ ...frame, ...inside });
	const hit = effect({ ...frame, ...onFront });
	const far = effect({ ...frame, ...outside });

	// Then only the particle on the front moves.
	expect(near).toEqual({ x: 0, y: 0 });
	expect(hit.x).toBeGreaterThan(0);
	expect(far).toEqual({ x: 0, y: 0 });
});

it("fades as it travels and ends so ordinary drift can resume", () => {
	// Given particles at the front at early and late event ages.
	const earlyParticle = { x: 0.85, y: 0 };
	const lateParticle = { x: 1.7, y: 0 };

	// When each particle meets the front and the event expires.
	const early = effect({ ...frame, ...earlyParticle });
	const late = effect({
		...frame,
		...lateParticle,
		event: { ...event, age: 1 },
	});
	const expired = effect({
		...frame,
		x: 4.59,
		y: 0,
		aspect: 5,
		event: { ...event, age: 2.7 },
	});

	// Then the later push is weaker and the expired event has no force.
	expect(late.x).toBeGreaterThan(0);
	expect(late.x).toBeLessThan(early.x);
	expect(expired).toEqual({ x: 0, y: 0 });
});

it("returns a finite still displacement for invalid input", () => {
	// Given a non-finite event age from an external state boundary.
	const invalid = { ...event, age: Number.NaN };

	// When the effect is evaluated for a particle.
	const displacement = effect({ ...frame, x: 0.85, y: 0, event: invalid });

	// Then it leaves the particle position unchanged.
	expect(displacement).toEqual({ x: 0, y: 0 });
});
