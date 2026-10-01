import { expect, it } from "vitest";
import {
	effect,
	type GatherEvent,
} from "../static/js/thought-field-click-gather.js";

const FRAME = 1 / 60;
const AT_RIGHT = { x: 0.3, y: 0, dt: FRAME, aspect: 1.5 };

function event(overrides: Partial<GatherEvent> = {}): GatherEvent {
	return {
		x: 0,
		y: 0,
		age: 0,
		strength: 1,
		mode: "gather",
		phase: "hold",
		...overrides,
	};
}

it("draws a nearby particle inward more strongly during a long hold", () => {
	// Given a particle to the right of a press.
	const short = event({ age: 0.04, heldFor: 0.04 });
	const long = event({ age: 1, heldFor: 1 });

	// When the press acts for one frame at each duration.
	const early = effect({ ...AT_RIGHT, event: short });
	const charged = effect({ ...AT_RIGHT, event: long });

	// Then both pulls point inward and the long hold pulls harder.
	expect(early.x).toBeLessThan(0);
	expect(charged.x).toBeLessThan(early.x);
	expect(early.y).toBeCloseTo(0);
});

it("sends particles outward after a short tap", () => {
	// Given a press released after only a few frames.
	const released = event({ phase: "release", age: 0, heldFor: 0.04 });

	// When the release acts on a nearby particle.
	const moved = effect({ ...AT_RIGHT, event: released });

	// Then it moves away from the press.
	expect(moved.x).toBeGreaterThan(0);
	expect(moved.y).toBe(0);
});

it("releases more strongly after a long hold and then returns to drift", () => {
	// Given a charged press and an earlier release frame.
	const fresh = event({ phase: "release", age: 0, heldFor: 1 });
	const short = event({ phase: "release", age: 0, heldFor: 0.04 });
	const fading = event({ phase: "release", age: 0.2, heldFor: 1 });
	const ended = event({ phase: "release", age: 0.5, heldFor: 1 });

	// When the release ages.
	const charged = effect({ ...AT_RIGHT, event: fresh });
	const tapped = effect({ ...AT_RIGHT, event: short });
	const later = effect({ ...AT_RIGHT, event: fading });
	const rest = effect({ ...AT_RIGHT, event: ended });

	// Then a charged release is stronger, fades, and stops completely.
	expect(charged.x).toBeGreaterThan(tapped.x);
	expect(later.x).toBeGreaterThan(0);
	expect(later.x).toBeLessThan(charged.x);
	expect(rest).toEqual({ x: 0, y: 0 });
});

it("stops immediately when a press is cancelled", () => {
	// Given a charged press that is cancelled.
	const cancelled = event({ phase: "cancel", age: 0.7, heldFor: 0.7 });

	// When a nearby particle is stepped.
	const moved = effect({ ...AT_RIGHT, event: cancelled });

	// Then there is no gather or release displacement.
	expect(moved).toEqual({ x: 0, y: 0 });
});

it("does not divide by zero at the press centre", () => {
	// Given a particle at the press centre.
	const pressed = event({ age: 0.2 });

	// When the particle is stepped.
	const centred = effect({ ...AT_RIGHT, x: 0, event: pressed });

	// Then the displacement is zero and finite.
	expect(centred).toEqual({ x: 0, y: 0 });
});

it("ignores an invalid frame duration", () => {
	// Given a frame duration that is not a number.
	const pressed = event({ age: 0.2 });

	// When a nearby particle is stepped.
	const invalid = effect({ ...AT_RIGHT, dt: Number.NaN, event: pressed });

	// Then the displacement is zero and finite.
	expect(invalid).toEqual({ x: 0, y: 0 });
});
