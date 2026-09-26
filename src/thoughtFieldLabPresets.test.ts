import { describe, expect, it } from "vitest";
import { KNOBS, TOGGLES } from "../static/js/thought-field-lab-knobs.js";
import type { KnobGroup } from "../static/js/thought-field-lab-knobs.js";
import type { Preset } from "../static/js/thought-field-lab-presets.js";
import {
	PRESETS,
	presetState,
} from "../static/js/thought-field-lab-presets.js";
import {
	SLOTS_KEY,
	createSlotStore,
} from "../static/js/thought-field-lab-slots.js";
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
	setEngine,
	setKnob,
	setStyle,
	setToggle,
} from "../static/js/thought-field-lab.js";
import type { KnobValues, LabState } from "../static/js/thought-field-lab.js";

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

function preset(name: string): Preset {
	const found = PRESETS.find((candidate) => candidate.name === name);
	if (found === undefined) {
		throw new Error(`no preset ${name}`);
	}
	return found;
}

const isGroup = (group: string): group is KnobGroup => group in KNOBS;

// One knob's value, where the group may be missing.
const value = (values: KnobValues | undefined, key: string) => values?.[key];

// Every knob value a preset sets, with where it is set.
const presetKnobs = PRESETS.flatMap(({ name, knobs = {} }) =>
	Object.entries(knobs).flatMap(([group, values]) =>
		Object.entries(values ?? {}).map(([key, value]) => ({
			where: `${name}: ${group}.${key}`,
			knob: isGroup(group) ? KNOBS[group][key] : undefined,
			value,
		})),
	),
);

describe("lab presets", () => {
	it("keep every value inside its slider's range", () => {
		expect(presetKnobs.length).toBeGreaterThan(20);
		for (const { where, knob, value } of presetKnobs) {
			const [min, max] = knob ?? [Number.NaN, Number.NaN];
			expect(value, where).toBeGreaterThanOrEqual(min);
			expect(value, where).toBeLessThanOrEqual(max);
		}
	});

	it("name only engines, styles, toggles and knobs that exist", () => {
		const fields = ["name", "engine", "style", "toggles", "knobs"];
		for (const entry of PRESETS) {
			const { name, engine, style, toggles = {}, knobs = {} } = entry;
			expect(fields, name).toEqual(expect.arrayContaining(Object.keys(entry)));
			expect(["swirl", "liquid"], name).toContain(engine);
			expect([undefined, "galaxy", "pattern", "off"], name).toContain(style);
			expect(Object.keys(TOGGLES), name).toEqual(
				expect.arrayContaining(Object.keys(toggles)),
			);
			for (const [group, values] of Object.entries(knobs)) {
				const known = isGroup(group) ? Object.keys(KNOBS[group]) : [];
				const keys = Object.keys(values ?? {});
				expect(known, `${name}: ${group}`).toEqual(
					expect.arrayContaining(keys),
				);
			}
		}
		const names = PRESETS.map((entry) => entry.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it("keep tilt drift at or below each engine's default", () => {
		for (const entry of PRESETS) {
			const { swirl, liquid } = presetState(entry).knobs;
			const where = entry.name;
			expect(value(swirl, "tiltGain"), where).toBeLessThanOrEqual(3);
			expect(value(liquid, "tiltGain"), where).toBeLessThanOrEqual(2);
		}
	});
});

describe("applying a preset", () => {
	it("replaces the lab state instead of merging onto the old tweaks", () => {
		const store = createLabStore(memoryStorage());
		store.update((s) => setStyle(setToggle(s, "tilt", false), "off"));
		store.update((s) => setKnob(s, "slosh", "deadzone", 9));
		store.update((s) => setKnob(s, "liquid", "drag", 0.9));
		const snow = preset("Snow globe");
		store.update(() => presetState(snow));
		const state = store.state();
		const { slosh, liquid } = state.knobs;
		expect(state.engine).toBe("liquid");
		expect(value(liquid, "coupling")).toBe(
			value(snow.knobs?.liquid, "coupling"),
		);
		// The old tweaks are gone: back to the defaults, not kept.
		expect(state.style).toBe("galaxy");
		expect(state.toggles.tilt).toBe(true);
		expect(value(slosh, "deadzone")).toBe(5);
		expect(value(liquid, "drag")).toBe(0.3);
		expect(state.preset).toEqual({ name: "Snow globe", modified: false });
	});

	it("leaves every knob it does not name at its default", () => {
		const nebula = preset("Nebula");
		const state = presetState(nebula);
		const { galaxy, liquid, pattern, swirl } = state.knobs;
		expect(galaxy).toEqual(DEFAULT_LAB.knobs.galaxy);
		expect(liquid).toEqual(DEFAULT_LAB.knobs.liquid);
		expect(value(pattern, "eddyDrift")).toBe(
			value(nebula.knobs?.pattern, "eddyDrift"),
		);
		// Named in the swirl group, but not by Nebula.
		expect(value(swirl, "drag")).toBe(0.2);
		expect(state.toggles).toEqual(DEFAULT_LAB.toggles);
	});

	it("switches off the ingredients it names", () => {
		const { toggles } = presetState(preset("Calm drift"));
		expect(toggles).toEqual({
			lag: true,
			tilt: true,
			liquid: false,
			bubble: false,
		});
	});
});

describe("a preset once changed", () => {
	const applied = presetState(preset("Glitter"));
	const changes: Record<string, (state: LabState) => LabState> = {
		knob: (s) => setKnob(s, "slosh", "deadzone", 6),
		toggle: (s) => setToggle(s, "lag", false),
		engine: (s) => setEngine(s, "liquid"),
		style: (s) => setStyle(s, "pattern"),
		reset: resetEngine,
	};

	it.each(Object.entries(changes))(
		"is marked modified by a %s change",
		(_, change) => {
			expect(change(applied).preset).toEqual({
				name: "Glitter",
				modified: true,
			});
		},
	);

	it("reports its name and the change in the exported JSON", () => {
		const changed = setKnob(applied, "slosh", "deadzone", 6);
		const json = JSON.parse(exportLab(changed));
		expect(json.preset).toEqual({ name: "Glitter", modified: true });
	});

	it("keeps an unmarked state unmarked", () => {
		expect(setKnob(DEFAULT_LAB, "slosh", "deadzone", 6).preset).toBeNull();
	});
});

describe("lab slots", () => {
	it("load back what was saved, marked with the slot's name", () => {
		const slots = createSlotStore(memoryStorage());
		const tuned = setKnob(presetState(preset("Nebula")), "galaxy", "decay", 2);
		const kept = slots.save(1, tuned);
		const [first, second, third] = slots.slots();
		expect(first).toBeNull();
		expect(third).toBeNull();
		expect(value(second?.knobs.galaxy, "decay")).toBe(2);
		expect(second?.style).toBe("pattern");
		expect(second?.preset).toEqual({ name: "Mine 2", modified: false });
		expect(kept).toEqual(second);
	});

	it("survive a reload, apart from the live state", () => {
		const storage = memoryStorage();
		const tuned = setKnob(
			{ ...DEFAULT_LAB, engine: "liquid" },
			"liquid",
			"bubble",
			2.5,
		);
		createSlotStore(storage).save(2, tuned);
		const reloaded = createSlotStore(storage).slots()[2];
		expect(reloaded?.engine).toBe("liquid");
		expect(value(reloaded?.knobs.liquid, "bubble")).toBe(2.5);
		expect(reloaded?.preset?.name).toBe("Mine 3");
		expect(storage.saved.has(LAB_KEY)).toBe(false);
	});

	it("are all empty when the saved slots are not JSON", () => {
		const storage = memoryStorage();
		storage.setItem(SLOTS_KEY, "[{not json");
		expect(createSlotStore(storage).slots()).toEqual([null, null, null]);
	});

	it("empty only a slot whose save is out of shape", () => {
		const storage = memoryStorage();
		const good = JSON.parse(serializeLab(presetState(preset("Glitter"))));
		storage.setItem(SLOTS_KEY, JSON.stringify(["junk", good, { version: 0 }]));
		const [junk, kept, old] = createSlotStore(storage).slots();
		expect(junk).toBeNull();
		expect(old).toBeNull();
		expect(kept?.style).toBe("off");
	});
});

describe("lab saves from before presets", () => {
	it("still load, unmarked", () => {
		const tuned = setKnob(
			{ ...DEFAULT_LAB, engine: "liquid" },
			"liquid",
			"drag",
			0.7,
		);
		const { preset: _mark, ...old } = JSON.parse(serializeLab(tuned));
		const parsed = parseLab(JSON.stringify(old));
		expect(parsed.engine).toBe("liquid");
		expect(value(parsed.knobs.liquid, "drag")).toBe(0.7);
		expect(parsed.preset).toBeNull();
	});

	it("keep a preset's mark across a reload", () => {
		const storage = memoryStorage();
		const store = createLabStore(storage);
		store.update(() => presetState(preset("Stormy water")));
		store.update((s) => setKnob(s, "liquid", "bubble", 0.5));
		const reloaded = createLabStore(storage).state();
		expect(reloaded.preset).toEqual({ name: "Stormy water", modified: true });
	});
});
