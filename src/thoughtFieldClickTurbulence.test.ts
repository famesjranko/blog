import { expect, it } from "vitest";
import {
	effect,
	type EffectOptions,
} from "../static/js/thought-field-click-turbulence.js";

const OPTIONS: EffectOptions = {
	x: 0.2,
	y: 0.1,
	event: { x: 0, y: 0, age: 0.1, strength: 1, mode: "turbulence" },
	dt: 1 / 60,
	aspect: 1.5,
};

function magnitude(vector: { x: number; y: number }): number {
	return Math.hypot(vector.x, vector.y);
}

it("moves a nearby particle but leaves a distant particle untouched", () => {
	// Given a fresh disturbance near one particle.
	const nearby = OPTIONS;
	const distant = { ...OPTIONS, x: 0.8 };

	// When each particle receives the same event.
	const nearMove = effect(nearby);
	const farMove = effect(distant);

	// Then only the nearby particle moves.
	expect(magnitude(nearMove)).toBeGreaterThan(0);
	expect(farMove).toEqual({ x: 0, y: 0 });
});

it("repeats the same motion for identical inputs", () => {
	// Given one event and particle position.
	const options = OPTIONS;

	// When the displacement is calculated again.
	const first = effect(options);
	const repeat = effect(options);

	// Then repeated inputs agree.
	expect(repeat).toEqual(first);
});

it("changes motion when the event phase changes", () => {
	// Given two otherwise identical events with different phases.
	const shifted = { ...OPTIONS, event: { ...OPTIONS.event, phase: Math.PI } };

	// When each displacement is calculated.
	const first = effect(OPTIONS);
	const otherPhase = effect(shifted);

	// Then their motion differs.
	expect(otherPhase).not.toEqual(first);
});

it("fades to zero after its lifetime", () => {
	// Given the same particle at early, late, and expired ages.
	const early = { ...OPTIONS, event: { ...OPTIONS.event, age: 0 } };
	const late = { ...OPTIONS, event: { ...OPTIONS.event, age: 1.39 } };
	const expired = { ...OPTIONS, event: { ...OPTIONS.event, age: 1.4 } };

	// When the event ages.
	const earlyMove = effect(early);
	const lateMove = effect(late);
	const expiredMove = effect(expired);

	// Then the displacement shrinks and eventually stops.
	expect(magnitude(earlyMove)).toBeGreaterThan(magnitude(lateMove));
	expect(magnitude(lateMove)).toBeLessThan(magnitude(earlyMove) * 0.001);
	expect(magnitude(lateMove)).toBeGreaterThan(0);
	expect(expiredMove).toEqual({ x: 0, y: 0 });
});

it("does not move particles for another click mode", () => {
	// Given an event in another mode.
	const otherMode = {
		...OPTIONS,
		event: { ...OPTIONS.event, mode: "burst" },
	};

	// When the event reaches this effect.
	const move = effect(otherMode);

	// Then this mode adds no displacement.
	expect(move).toEqual({ x: 0, y: 0 });
});

it("keeps an extreme finite spin from reaching infinity", () => {
	// Given an extreme but finite spin.
	const extreme = {
		...OPTIONS,
		x: 0.01,
		y: 0.53,
		event: { ...OPTIONS.event, spin: Number.MAX_VALUE },
	};

	// When the event is applied to a particle.
	const move = effect(extreme);

	// Then each displacement component remains finite.
	expect(Number.isFinite(move.x)).toBe(true);
	expect(Number.isFinite(move.y)).toBe(true);
});

it("rejects a non-finite event strength", () => {
	// Given an event with an invalid strength.
	const invalid = {
		...OPTIONS,
		event: { ...OPTIONS.event, strength: Number.POSITIVE_INFINITY },
	};

	// When the event reaches this effect.
	const move = effect(invalid);

	// Then it adds no displacement.
	expect(move).toEqual({ x: 0, y: 0 });
});
