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
 * Knob values are kept while a toggle is off; only the resolved
 * settings see the override.
 * @typedef {{
 *   engine: EngineKind,
 *   style: SwirlStyle,
 *   toggles: Readonly<Record<ToggleName, boolean>>,
 *   knobs: Readonly<Record<KnobGroup, KnobValues>>,
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
 * @param {LabState} state
 * @param {KnobGroup} group
 * @param {string} key
 * @param {number} value
 * @returns {LabState}
 */
export function setKnob(state, group, key, value) {
	const values = { ...state.knobs[group], [key]: value };
	return { ...state, knobs: { ...state.knobs, [group]: values } };
}

/**
 * @param {LabState} state
 * @param {ToggleName} name
 * @param {boolean} on
 * @returns {LabState}
 */
export function setToggle(state, name, on) {
	return { ...state, toggles: { ...state.toggles, [name]: on } };
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
	return {
		...state,
		style: liquid ? state.style : DEFAULT_LAB.style,
		knobs: { ...state.knobs, ...Object.fromEntries(knobs) },
		toggles: { ...state.toggles, ...Object.fromEntries(toggles) },
	};
}

/**
 * JSON to send back: the choices and the fully resolved tunings.
 * @param {LabState} state
 * @returns {string}
 */
export function exportLab(state) {
	const { engine, style, toggles } = state;
	const settings = resolveSettings(state);
	return JSON.stringify({ engine, style, toggles, settings }, null, 2);
}
