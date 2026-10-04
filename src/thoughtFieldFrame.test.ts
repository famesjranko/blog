import { describe, expect, it } from "vitest";
import type { ClickSource } from "../static/js/thought-field-clicks.js";
import type { Pointer } from "../static/js/thought-field-particles.js";
import { makePoints } from "../static/js/thought-field-particles.js";

// thought-field-frame.js has no .d.ts, and the Node typecheck does not read
// JavaScript, so load it by URL as the browser loop does for the globe, and
// type only the part this test calls.
interface FrameOptions {
	renderer: { render: () => void };
	field: ReturnType<typeof makePoints>;
	pointer: Pointer;
	hero: null;
	meteors: { slots: never[]; started: boolean; nextAt: number };
	dims: { aspect: number };
	motion: null;
	clicks: ClickSource | null;
}
interface FrameModule {
	renderFrame(
		options: FrameOptions,
		now: number,
		dt: number,
		state: typeof SETTLED,
	): unknown;
}
const frameUrl = new URL(
	"../static/js/thought-field-frame.js",
	import.meta.url,
);
const { renderFrame }: FrameModule = await import(frameUrl.href);

const NOW = 10_000;
const DT = 1 / 60;
const ASPECT = 1.5;

// A birth that has finished and no snow globe, so only the pointer
// strength and the click source act on the frame.
const SETTLED = {
	physics: null,
	growth: { age: 9, growing: false, seeds: new Float32Array(0) },
};

// Already started and with no slots: no meteor spawns or moves.
const NO_METEORS = { slots: [], started: true, nextAt: Infinity };

function clicksWith(hover: number): ClickSource & { stepped: number } {
	const source = {
		stepped: 0,
		step() {
			source.stepped += 1;
		},
		hover: () => hover,
	};
	return source;
}

// A pointer that moved 100 ms before NOW, so its own strength is 1.
function frame(clicks: ClickSource | null): Pointer {
	const pointer: Pointer = { x: 0, y: 0, strength: 0, lastMove: NOW - 100 };
	renderFrame(
		{
			renderer: { render: () => undefined },
			field: makePoints(4, [{ r: 0, g: 0, b: 0 }]),
			pointer,
			hero: null,
			meteors: NO_METEORS,
			dims: { aspect: ASPECT },
			motion: null,
			clicks,
		},
		NOW,
		DT,
		SETTLED,
	);
	return pointer;
}

describe("renderFrame pointer hover", () => {
	it("keeps the full hover strength when there is no click source", () => {
		// Given a pointer that moved 100 ms ago and no click source
		// When one frame renders
		const pointer = frame(null);

		// Then the pointer strength is the unscaled 1
		expect(pointer.strength).toBe(1);
	});

	it.each([
		[0, 0],
		[0.25, 0.25],
		[1, 1],
	])("scales the hover by a click source that returns %s", (hover, want) => {
		// Given a pointer that moved 100 ms ago and a click source
		const clicks = clicksWith(hover);

		// When one frame renders
		const pointer = frame(clicks);

		// Then the pointer strength is the hover scale
		expect(pointer.strength).toBeCloseTo(want, 9);

		// And the click source stepped once
		expect(clicks.stepped).toBe(1);
	});
});
