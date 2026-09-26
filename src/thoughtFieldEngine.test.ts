import { describe, expect, it } from "vitest";
import type {
	Engine,
	EngineKind,
	Settings,
} from "../static/js/thought-field-engine.js";
import {
	DEFAULT_SETTINGS,
	makeEngine,
	stepEngine,
} from "../static/js/thought-field-engine.js";
import type { SloshStep } from "../static/js/thought-field-slosh.js";
import { restingSlosh } from "../static/js/thought-field-slosh.js";

const FRAME = 1 / 60;
const ASPECT = 0.65;
const KINDS: [EngineKind, EngineKind][] = [
	["swirl", "liquid"],
	["liquid", "swirl"],
];

function scatteredField(count: number) {
	return {
		count,
		pos: Float32Array.from({ length: count * 3 }, (_, i) =>
			i % 3 === 2 ? 0 : (((i * 0.37) % 2) - 1) * 0.6,
		),
		scale: Float32Array.from({ length: count }, (_, i) => 0.9 + (i % 10) / 11),
	};
}

function filtered(shakeX: number): SloshStep {
	const zero = { x: 0, y: 0 };
	return {
		state: restingSlosh(),
		shift: zero,
		delta: zero,
		shake: { x: shakeX, y: 0 },
		lean: zero,
	};
}

// Half a second of a firm 12 m/s², 3 Hz sideways shake.
function shaken(
	engine: Engine,
	field: ReturnType<typeof scatteredField>,
	settings: Settings,
): Engine {
	let current = engine;
	for (let frame = 0; frame < 30; frame += 1) {
		const shake = 12 * Math.sin(2 * Math.PI * 3 * frame * FRAME);
		current = stepEngine({
			engine: current,
			settings,
			field,
			filtered: filtered(shake),
			dt: FRAME,
			time: frame * FRAME,
			aspect: ASPECT,
		}).engine;
	}
	return current;
}

describe("stepEngine", () => {
	it.each(KINDS)("hands a stirred %s over to a resting %s", (from, to) => {
		const field = scatteredField(24);
		const before = { ...DEFAULT_SETTINGS, engine: from };
		const stirred = shaken(makeEngine(from, field.count), field, before);
		const handed = Float32Array.from(field.pos);
		expect(handed).not.toEqual(scatteredField(24).pos);
		const step = stepEngine({
			engine: stirred,
			settings: { ...DEFAULT_SETTINGS, engine: to },
			field,
			filtered: filtered(0),
			dt: FRAME,
			time: 1,
			aspect: ASPECT,
		});
		expect(step.engine.kind).toBe(to);
		// A fresh engine starts still: no jump, no inherited velocity.
		expect(field.pos).toEqual(handed);
	});

	it("runs the liquid on the settings it is given", () => {
		const field = scatteredField(24);
		const liquid = { ...DEFAULT_SETTINGS.liquid, shakeGain: 0, tiltGain: 0 };
		const settings = { ...DEFAULT_SETTINGS, engine: "liquid" as const, liquid };
		shaken(makeEngine("liquid", field.count), field, settings);
		expect(field.pos).toEqual(scatteredField(24).pos);
	});
});
