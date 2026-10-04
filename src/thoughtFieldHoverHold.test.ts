import { expect, it, vi } from "vitest";
import type {
	ClickEvent,
	Field,
	Pointer,
} from "../static/js/thought-field-particles.js";

vi.mock("../static/js/thought-field-meteors.js", () => ({
	stepMeteors: vi.fn(),
}));

type FrameOptions = {
	renderer: { render: () => void };
	field: Field;
	pointer: Pointer;
	hero: null;
	meteors: { slots: { active: boolean; x: number; y: number }[] };
	dims: { aspect: number };
	motion: null;
	clicks: (dt: number) => ClickEvent[];
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
const modes = ["hold-pull", "hold-push", "hold-orbit"] as const;

function field(): Field {
	return {
		count: 1,
		palette: [],
		pos: Float32Array.from([0.2, 0, 0]),
		alpha: new Float32Array(1),
		col: new Float32Array(3),
		base: Float32Array.from([0.2, 0, 0]),
		phase: new Float32Array(2),
		scale: Float32Array.from([1]),
	};
}

function step(events: ClickEvent[], recentPointer: boolean, meteor = false) {
	const particles = field();
	const pointer = {
		x: 0,
		y: 0,
		strength: 0,
		lastMove: recentPointer ? NOW : 0,
	};
	const options: FrameOptions = {
		renderer: { render: vi.fn() },
		field: particles,
		pointer,
		hero: null,
		meteors: { slots: [{ active: meteor, x: 0.2, y: 0.1 }] },
		dims: { aspect: 1 },
		motion: null,
		clicks: () => events,
	};
	renderFrame(options, NOW, DT, {
		physics: null,
		growth: { age: 0, growing: false, seeds: new Float32Array(1) },
	});
	return {
		position: Array.from(particles.pos),
		pointerStrength: pointer.strength,
	};
}

function hold(
	mode: (typeof modes)[number],
	phase: "hold" | "release",
): ClickEvent {
	return {
		mode,
		phase,
		x: 1,
		y: 0,
		age: phase === "hold" ? 0 : 0.1,
		strength: 1,
		heldFor: 0.5,
	};
}

it.each(modes)("suspends hover during %s hold and release tail", (mode) => {
	// Given a recent pointer and a particle near it.
	const ordinary = step([], true);
	const stale = step([], false);
	expect(ordinary.position).not.toEqual(stale.position);

	// When the selected hold or its release tail is active.
	const held = step([hold(mode, "hold")], true);
	const released = step([hold(mode, "release")], true);

	// Then pointer tracking continues while its particle repulsion is masked.
	expect(held.pointerStrength).toBe(1);
	expect(released.pointerStrength).toBe(1);
	expect(held.position).toEqual(step([hold(mode, "hold")], false).position);
	expect(released.position).toEqual(
		step([hold(mode, "release")], false).position,
	);
});

it("restores hover on the first frame after a hold tail expires", () => {
	// Given a recent pointer after the hold input has removed its expired tail.
	const ordinary = step([], true);
	const stale = step([], false);

	// When the next frame receives no hold event.
	const restored = step([], true);

	// Then the pointer repels particles again in that frame.
	expect(restored.position).toEqual(ordinary.position);
	expect(restored.position).not.toEqual(stale.position);
});

it("keeps meteor repulsion during a hold", () => {
	// Given a held particle with a meteor crossing nearby.
	const event = hold("hold-pull", "hold");
	const withoutMeteor = step([event], true);

	// When the meteor is active in the same frame.
	const withMeteor = step([event], true, true);

	// Then the meteor still changes the particle position.
	expect(withMeteor.position).not.toEqual(withoutMeteor.position);
});
