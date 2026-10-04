import { describe, expect, it } from "vitest";
import { parseDemo } from "../static/js/thought-field-click-demo.js";
import { CLICK_MODES } from "../static/js/thought-field-click-modes.js";
import type { Click, ClickMode } from "../static/js/thought-field-clicks.js";
import {
	createClicks,
	HOVER_RETURN,
} from "../static/js/thought-field-clicks.js";
import type { Field } from "../static/js/thought-field-particles.js";
import { stepParticles } from "../static/js/thought-field-particles.js";

const FRAME = 1 / 60;
const ASPECT = 1.5;
const PRESS = { x: 0.2, y: -0.1 };
// The candidates of issue #40, in panel order, with `off` first.
const IDS = [
	"off",
	"well",
	"bloom",
	"spin",
	"scatter",
	"shockwave",
	"implode",
	"attract",
	"vortex",
	"gather",
	"turbulence",
];
// The issue's cap on live clicks, restated so a changed cap fails here.
const MOST_LIVE = 8;
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
	it("lists the eleven modes once each, in panel order", () => {
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

	it("holds the press for well, bloom, spin and gather", () => {
		// Given the registry
		// When the modes that hold the press are listed
		const held = CLICK_MODES.filter((mode) => mode.hold).map((m) => m.id);

		// Then they are the three hold variants and gather
		expect(held).toEqual(["well", "bloom", "spin", "gather"]);
	});
});

describe("the hold modes in the registry", () => {
	it("yields the hover for well and bloom, each living past the return", () => {
		// Given the registry
		// When the modes that yield the pointer hover are listed
		const yielding = CLICK_MODES.filter((mode) => mode.yieldHover);

		// Then they are well and bloom
		expect(yielding.map((mode) => mode.id)).toEqual(["well", "bloom"]);
		// And each lives at least as long as the hover takes to return
		for (const mode of yielding) {
			expect(mode.life, mode.id).toBeGreaterThanOrEqual(HOVER_RETURN);
		}
	});

	it("opens scatter by default and each hold variant by name", () => {
		// Given the registry
		// When the demo parses a bare, an unknown and each variant's query
		const opened = (query: string) => parseDemo(query, CLICK_MODES);

		// Then a bare or unknown id opens scatter
		expect(opened("?hero-demo")).toBe("scatter");
		expect(opened("?hero-demo=nope")).toBe("scatter");
		// And each hold variant opens itself
		for (const id of ["well", "bloom", "spin"]) {
			expect(opened(`?hero-demo=${id}`), id).toBe(id);
		}
	});
});

describe("each candidate's force", () => {
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

const HELD_MODES = CLICK_MODES.filter((mode) =>
	["well", "bloom", "spin"].includes(mode.id),
);

// What the held click does over `frames` frames: each frame it pushes a
// fresh field at rest, so the sum reads the force's strength at that
// point of the hold and not the field's own drift.
function push(clicks: ReturnType<typeof createClicks>, frames: number): number {
	let total = 0;
	for (let n = 0; n < frames; n += 1) {
		const field = makeField();
		const before = field.pos.slice();
		clicks.step({ field, dt: FRAME, aspect: ASPECT });
		for (let i = 0; i < before.length; i += 1) {
			total += Math.abs((field.pos[i] ?? 0) - (before[i] ?? 0));
		}
	}
	return total;
}

describe("each hold variant held through the engine", () => {
	it.each(HELD_MODES.map((mode) => [mode.id, mode] as const))(
		"%s pushes harder at the end of a 1.5 s hold than at the start",
		(id, mode) => {
			// Given a press held in this mode
			const clicks = createClicks(mode);
			clicks.press(PRESS.x, PRESS.y);

			// When the first 0.1 s, the hold up to 1.4 s, and the last 0.1 s run
			const first = push(clicks, 6);
			push(clicks, 78);
			const last = push(clicks, 6);

			// Then the last 0.1 s moves the field further than the first
			expect(last, id).toBeGreaterThan(first);
			// And the press is still held
			expect(clicks.live()[0]?.released).toBe(-1);
			// And the pointer hover is silenced for well and bloom and kept for spin
			expect(clicks.hover(), id).toBe(id === "spin" ? 1 : 0);
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
			expect(most).toBeLessThanOrEqual(MOST_LIVE);
			// And the field steps exactly as one with no clicks
			expect(clicks.live()).toEqual([]);
			expect(Array.from(field.pos)).toEqual(Array.from(twin.pos));
		},
	);
});
