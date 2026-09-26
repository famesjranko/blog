import { describe, expect, it } from "vitest";
import { KNOBS } from "../static/js/thought-field-lab-knobs.js";
import type { KnobGroup } from "../static/js/thought-field-lab-knobs.js";
import type { LabStorage } from "../static/js/thought-field-lab-store.js";
import {
	LAB_KEY,
	createLabStore,
	parseLab,
	serializeLab,
} from "../static/js/thought-field-lab-store.js";
import {
	DEFAULT_LAB,
	exportLab,
	resetEngine,
	resolveSettings,
	setKnob,
	setToggle,
} from "../static/js/thought-field-lab.js";

function memoryStorage(): LabStorage & { saved: Map<string, string> } {
	const saved = new Map<string, string>();
	return {
		saved,
		getItem: (key) => saved.get(key) ?? null,
		setItem: (key, value) => {
			saved.set(key, value);
		},
	};
}

describe("lab toggles", () => {
	it("hold both engines' shake gain at 0 while particle lag is off", () => {
		const tuned = setKnob(DEFAULT_LAB, "liquid", "shakeGain", 4.2);
		const off = resolveSettings(setToggle(tuned, "lag", false));
		expect(off.liquid.shakeGain).toBe(0);
		expect(off.swirl.shakeGain).toBe(0);
	});

	it("restore the slider's value when switched back on", () => {
		const tuned = setKnob(DEFAULT_LAB, "liquid", "shakeGain", 4.2);
		const off = setToggle(tuned, "lag", false);
		const on = resolveSettings(setToggle(off, "lag", true));
		expect(on.liquid.shakeGain).toBe(4.2);
		expect(on.swirl.shakeGain).toBe(1);
	});

	it("zero only their own knob", () => {
		const tuned = setKnob(DEFAULT_LAB, "liquid", "coupling", 7.5);
		const off = resolveSettings(setToggle(tuned, "bubble", false));
		expect(off.liquid.bubble).toBe(0);
		expect(off.liquid.coupling).toBe(7.5);
		expect(off.liquid.tiltGain).toBe(2);
	});
});

describe("lab reset", () => {
	it("restores the liquid's knobs and toggles but keeps the shared input", () => {
		const tuned = setKnob(
			{ ...DEFAULT_LAB, engine: "liquid" },
			"liquid",
			"drag",
			0.9,
		);
		const changed = setToggle(
			setKnob(tuned, "slosh", "deadzone", 9),
			"liquid",
			false,
		);
		const reset = resolveSettings(resetEngine(changed));
		expect(reset.liquid.drag).toBe(0.3);
		expect(reset.liquid.coupling).toBe(6);
		expect(reset.slosh.deadzone).toBe(9);
	});
});

describe("lab knob table", () => {
	it("puts every default inside its slider's range", () => {
		for (const group of Object.keys(KNOBS) as KnobGroup[]) {
			for (const [key, [min, max]] of Object.entries(KNOBS[group])) {
				const value = DEFAULT_LAB.knobs[group][key];
				expect(value, `${group}.${key}`).toBeGreaterThanOrEqual(min);
				expect(value, `${group}.${key}`).toBeLessThanOrEqual(max);
			}
		}
	});
});

describe("lab persistence", () => {
	it("reloads the saved state", () => {
		const storage = memoryStorage();
		const first = createLabStore(storage);
		first.update((s) => ({ ...s, engine: "liquid", style: "pattern" }));
		first.update((s) => setKnob(s, "galaxy", "maxWells", 12));
		first.update((s) => setToggle(s, "tilt", false));
		const reloaded = createLabStore(storage).state();
		expect(reloaded.engine).toBe("liquid");
		expect(reloaded.style).toBe("pattern");
		const { maxWells } = reloaded.knobs.galaxy;
		expect(maxWells).toBe(12);
		expect(reloaded.toggles.tilt).toBe(false);
		expect(storage.saved.has(LAB_KEY)).toBe(true);
	});

	it("falls back to the defaults on corrupt JSON", () => {
		const storage = memoryStorage();
		storage.setItem(LAB_KEY, "{not json");
		expect(createLabStore(storage).state()).toEqual(DEFAULT_LAB);
	});

	it("ignores a save from another version", () => {
		const saved = JSON.parse(
			serializeLab({ ...DEFAULT_LAB, engine: "liquid" }),
		);
		expect(parseLab(JSON.stringify({ ...saved, version: 0 }))).toEqual(
			DEFAULT_LAB,
		);
	});
});

describe("lab recovery", () => {
	it("replaces only the fields that are out of shape", () => {
		const good = setKnob(DEFAULT_LAB, "slosh", "deadzone", 7);
		const saved = JSON.parse(serializeLab(good));
		const text = JSON.stringify({
			...saved,
			engine: "warp",
			knobs: { ...saved.knobs, liquid: { drag: "fast" } },
		});
		const parsed = parseLab(text);
		expect(parsed.engine).toBe("swirl");
		const { drag } = parsed.knobs.liquid;
		const { deadzone } = parsed.knobs.slosh;
		expect(drag).toBe(0.3);
		expect(deadzone).toBe(7);
	});

	it("keeps working when storage throws", () => {
		const broken: LabStorage = {
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("full");
			},
		};
		const store = createLabStore(broken);
		store.update((s) => setKnob(s, "slosh", "tiltLean", 0.5));
		expect(store.settings().slosh.tiltLean).toBe(0.5);
	});
});

describe("lab export", () => {
	it("holds the choices and the fully resolved tunings", () => {
		const tuned = setKnob(DEFAULT_LAB, "slosh", "deadzone", 6.5);
		const state = setToggle(
			{ ...tuned, engine: "liquid", style: "off" },
			"liquid",
			false,
		);
		const json = JSON.parse(exportLab(state));
		expect(json.engine).toBe("liquid");
		expect(json.style).toBe("off");
		expect(json.toggles.liquid).toBe(false);
		expect(json.settings.slosh.deadzone).toBe(6.5);
		// Resolved: the override, and a knob the lab has no slider for.
		expect(json.settings.liquid.coupling).toBe(0);
		expect(json.settings.slosh.frequency).toBe(1.2);
		expect(json.settings.swirl.swirl).toBe("off");
		expect(json.settings.swirl.galaxy.maxWells).toBe(8);
	});
});
