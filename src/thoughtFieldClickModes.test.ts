import { describe, expect, it } from "vitest";
import { CLICK_MODES } from "../static/js/thought-field-click-modes.js";
import type { Click, ClickMode } from "../static/js/thought-field-clicks.js";
import { createClicks, MAX_LIVE } from "../static/js/thought-field-clicks.js";
import type { Field } from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
const PRESS = { x: 0.2, y: -0.1 };
// The candidates of issue #40, in panel order, with `off` first.
const IDS = [
	"off",
	"scatter",
	"shockwave",
	"implode",
	"attract",
	"vortex",
	"gather",
	"turbulence",
];
const ACTIVE = CLICK_MODES.filter((mode) => mode.id !== "off");

// Particles on rings 0.05 to 0.3 from PRESS, eight to a ring, at rest on
// their bases.
function makeField(): Field {
	const places: number[] = [];
	for (let ring = 1; ring <= 6; ring += 1) {
		for (let k = 0; k < 8; k += 1) {
			const angle = (k * Math.PI) / 4 + ring * 0.3;
			const r = ring * 0.05;
			places.push(
				PRESS.x + r * Math.cos(angle),
				PRESS.y + r * Math.sin(angle),
				0,
			);
		}
	}
	const pos = Float32Array.from(places);
	const count = pos.length / 3;
	return {
		count,
		palette: [],
		pos,
		alpha: new Float32Array(count),
		col: new Float32Array(count * 3),
		base: Float32Array.from(pos, (v, i) => (i % 3 === 0 ? v / ASPECT : v)),
		phase: new Float32Array(count * 2),
		scale: new Float32Array(count).fill(1),
	};
}

function largestMove(before: Float32Array, after: Float32Array): number {
	return Math.max(...before.map((v, i) => Math.abs((after[i] ?? 0) - v)));
}

// The frame as stepFrame runs it: the particles, then the clicks.
function frame(field: Field, step: (field: Field) => void, time: number): void {
	stepParticles({
		field,
		aspect: ASPECT,
		time,
		dt: FRAME,
		pointer: { x: 0, y: 0, strength: 0 },
		meteors: { slots: [] },
		hold: 1,
	});
	step(field);
}

describe("the mode registry", () => {
	it("lists the eight modes once each, in panel order", () => {
		// Given the registry
		// When its ids are read
		const ids = CLICK_MODES.map((mode) => mode.id);

		// Then they are the issue's candidates with off first
		expect(ids).toEqual(IDS);
		// And no id repeats
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every mode a label, and every candidate a positive life", () => {
		// Given the registry
		// When each entry is read
		// Then each has a label and a force
		for (const mode of CLICK_MODES) {
			expect(mode.label.length).toBeGreaterThan(0);
			expect(typeof mode.force).toBe("function");
		}
		// And each candidate lives for some time after release
		for (const mode of ACTIVE) {
			expect(mode.life, mode.id).toBeGreaterThan(0);
		}
	});

	it.each(ACTIVE.map((mode) => [mode.id, mode] as const))(
		"%s moves particles near the press point",
		(_, mode) => {
			// Given a field around a press in this mode
			const field = makeField();
			const before = field.pos.slice();
			const clicks = createClicks(mode);
			clicks.press(PRESS.x, PRESS.y);

			// When a quarter second of click steps runs
			for (let n = 0; n < 15; n += 1) {
				clicks.step({ field, dt: FRAME, aspect: ASPECT });
			}

			// Then at least one particle has moved
			expect(largestMove(before, field.pos)).toBeGreaterThan(0.001);
		},
	);
});

// Steps a click by hand at full strength, as the force alone would fade
// it, with the same press, hold and release as the engine run.
function byHand(mode: ClickMode, field: Field, frames: number): void {
	const click: Click = {
		...PRESS,
		age: 0,
		strength: 1,
		mode: mode.id,
		serial: 1,
		released: mode.hold ? -1 : 0,
	};
	for (let n = 0; n < frames; n += 1) {
		if (n === 30 && click.released < 0) {
			click.released = click.age;
		}
		mode.force({ field, click, dt: FRAME, aspect: ASPECT });
		click.age += FRAME;
	}
}

describe("each candidate decays once", () => {
	it.each(ACTIVE.map((mode) => [mode.id, mode] as const))(
		"%s moves the field as its force alone fades it",
		(_, mode) => {
			// Given a press driven by the engine, released after half a second
			const engine = makeField();
			const clicks = createClicks(mode);
			const serial = clicks.press(PRESS.x, PRESS.y);
			// And the same press stepped by hand at full strength
			const hand = makeField();

			// When three seconds pass for both
			for (let n = 0; n < 180; n += 1) {
				if (n === 30) {
					clicks.release(serial);
				}
				clicks.step({ field: engine, dt: FRAME, aspect: ASPECT });
			}
			byHand(mode, hand, 180);

			// Then the engine adds no fade of its own
			expect(Array.from(engine.pos)).toEqual(Array.from(hand.pos));
			// And the click has ended
			expect(clicks.live()).toEqual([]);
		},
	);
});

describe("ten fast taps", () => {
	it.each(ACTIVE.map((mode) => [mode.id, mode] as const))(
		"%s keeps at most eight live and returns to the drift",
		(_, mode) => {
			// Given a field and a mode with ten taps, one every other frame
			const field = makeField();
			const clicks = createClicks(mode);
			const step = (f: Field) => {
				clicks.step({ field: f, dt: FRAME, aspect: ASPECT });
			};
			let most = 0;

			// When the taps land and five seconds pass
			for (let n = 0; n < 300; n += 1) {
				if (n < 20 && n % 2 === 0) {
					clicks.release(clicks.press(PRESS.x + n * 0.01, PRESS.y));
				}
				most = Math.max(most, clicks.live().length);
				frame(field, step, n * FRAME);
			}
			const twin = { ...field, pos: field.pos.slice() };
			frame(field, step, 5);
			frame(twin, () => {}, 5);

			// Then no more than eight were ever live
			expect(most).toBeLessThanOrEqual(MAX_LIVE);
			// And the field steps exactly as one with no clicks
			expect(clicks.live()).toEqual([]);
			expect(Array.from(field.pos)).toEqual(Array.from(twin.pos));
		},
	);
});
