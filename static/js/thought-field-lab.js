// State model for the ?tune lab: the engine, swirl style, ingredient
// toggles and knob values, and how they resolve into the Settings the
// loop reads each frame. Every update returns a new state. No DOM, so
// Node can test it.

import { DEFAULT_SETTINGS } from "./thought-field-engine.js";
import { KNOBS, TOGGLES } from "./thought-field-lab-knobs.js";

/**
 * @typedef {import("./thought-field-engine.js").Settings} Settings
 * @typedef {import("./thought-field-engine.js").EngineKind} EngineKind
 * @typedef {import("./thought-field-globe.js").SwirlStyle} SwirlStyle
 * @typedef {import("./thought-field-lab-knobs.js").KnobGroup} KnobGroup
 * @typedef {import("./thought-field-lab-knobs.js").ToggleName} ToggleName
 * @typedef {Readonly<Record<string, number>>} KnobValues
 */

/**
 * The preset or saved slot the state was loaded from, and whether any
 * control has changed since; null until one is loaded.
 * @typedef {{ name: string, modified: boolean } | null} PresetMark
 */

/**
 * Knob values are kept while a toggle is off; only the resolved
 * settings see the override.
 * @typedef {{
 *   engine: EngineKind,
 *   style: SwirlStyle,
 *   toggles: Readonly<Record<ToggleName, boolean>>,
 *   knobs: Readonly<Record<KnobGroup, KnobValues>>,
 *   preset: PresetMark,
 * }} LabState
 */

export const TOGGLE_NAMES = /** @type {ToggleName[]} */ (Object.keys(TOGGLES));

/**
 * The values of GROUP's knobs in SOURCE, one of the default tunings.
 * @param {KnobGroup} group
 * @param {object} source
 * @returns {KnobValues}
 */
function pickKnobs(group, source) {
	const values = new Map(Object.entries(source));
	const keys = Object.keys(KNOBS[group]);
	return Object.freeze(
		Object.fromEntries(keys.map((key) => [key, Number(values.get(key))])),
	);
}

/** @type {Readonly<LabState>} */
export const DEFAULT_LAB = Object.freeze({
	engine: DEFAULT_SETTINGS.engine,
	style: DEFAULT_SETTINGS.swirl.swirl,
	toggles: Object.freeze({ lag: true, tilt: true, liquid: true, bubble: true }),
	knobs: Object.freeze({
		slosh: pickKnobs("slosh", DEFAULT_SETTINGS.slosh),
		swirl: pickKnobs("swirl", DEFAULT_SETTINGS.swirl),
		pattern: pickKnobs("pattern", DEFAULT_SETTINGS.swirl.pattern),
		galaxy: pickKnobs("galaxy", DEFAULT_SETTINGS.swirl.galaxy),
		liquid: pickKnobs("liquid", DEFAULT_SETTINGS.liquid),
	}),
	preset: null,
});

/**
 * GROUP's knob values with every switched-off ingredient at 0.
 * @param {LabState} state
 * @param {KnobGroup} group
 * @returns {KnobValues}
 */
export function resolvedKnobs(state, group) {
	const off = TOGGLE_NAMES.filter((name) => !state.toggles[name])
		.flatMap((name) => TOGGLES[name].knobs)
		.filter(([owner]) => owner === group)
		.map(([, key]) => [key, 0]);
	return { ...state.knobs[group], ...Object.fromEntries(off) };
}

/**
 * The settings the loop runs with: the defaults under the lab's values.
 * @param {LabState} state
 * @returns {Settings}
 */
export function resolveSettings(state) {
	const base = DEFAULT_SETTINGS;
	/** @type {(group: KnobGroup) => KnobValues} */
	const knobs = (group) => resolvedKnobs(state, group);
	return {
		engine: state.engine,
		slosh: { ...base.slosh, ...knobs("slosh") },
		swirl: {
			...base.swirl,
			...knobs("swirl"),
			swirl: state.style,
			pattern: { ...base.swirl.pattern, ...knobs("pattern") },
			galaxy: { ...base.swirl.galaxy, ...knobs("galaxy") },
		},
		liquid: { ...base.liquid, ...knobs("liquid") },
	};
}

/**
 * SOURCE as just loaded from the preset or slot NAME.
 * @param {LabState} source
 * @param {string} name
 * @returns {LabState}
 */
export function markLoaded(source, name) {
	return { ...source, preset: { name, modified: false } };
}

/**
 * STATE after a control changed: its preset, if any, is now modified.
 * @param {LabState} state
 * @returns {LabState}
 */
function edited(state) {
	const { preset } = state;
	return preset === null
		? state
		: { ...state, preset: { ...preset, modified: true } };
}

/**
 * @param {LabState} state
 * @param {KnobGroup} group
 * @param {string} key
 * @param {number} value
 * @returns {LabState}
 */
export function setKnob(state, group, key, value) {
	const values = { ...state.knobs[group], [key]: value };
	return edited({ ...state, knobs: { ...state.knobs, [group]: values } });
}

/**
 * @param {LabState} state
 * @param {ToggleName} name
 * @param {boolean} on
 * @returns {LabState}
 */
export function setToggle(state, name, on) {
	return edited({ ...state, toggles: { ...state.toggles, [name]: on } });
}

/**
 * @param {LabState} state
 * @param {EngineKind} engine
 * @returns {LabState}
 */
export function setEngine(state, engine) {
	return edited({ ...state, engine });
}

/**
 * @param {LabState} state
 * @param {SwirlStyle} style
 * @returns {LabState}
 */
export function setStyle(state, style) {
	return edited({ ...state, style });
}

/**
 * The active engine's knobs, its own toggles and (for the swirl) its
 * style back to their defaults; the shared input is kept.
 * @param {LabState} state
 * @returns {LabState}
 */
export function resetEngine(state) {
	const liquid = state.engine === "liquid";
	/** @type {KnobGroup[]} */
	const groups = liquid ? ["liquid"] : ["swirl", "pattern", "galaxy"];
	const own = TOGGLE_NAMES.filter((name) =>
		TOGGLES[name].knobs.every(([group]) => groups.includes(group)),
	);
	const knobs = groups.map((group) => [group, DEFAULT_LAB.knobs[group]]);
	const toggles = own.map((name) => [name, DEFAULT_LAB.toggles[name]]);
	return edited({
		...state,
		style: liquid ? state.style : DEFAULT_LAB.style,
		knobs: { ...state.knobs, ...Object.fromEntries(knobs) },
		toggles: { ...state.toggles, ...Object.fromEntries(toggles) },
	});
}

/**
 * JSON to send back: the preset or slot it started from, the choices
 * and the fully resolved tunings.
 * @param {LabState} state
 * @returns {string}
 */
export function exportLab(state) {
	const { preset, engine, style, toggles } = state;
	const settings = resolveSettings(state);
	const json = { preset, engine, style, toggles, settings };
	return JSON.stringify(json, null, 2);
}
