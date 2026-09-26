// Persistence for the ?tune lab: the state saved in localStorage under
// one versioned key, and the store the panel updates. A missing, corrupt
// or older save falls back to the defaults. No DOM, so Node can test it.

import { KNOBS } from "./thought-field-lab-knobs.js";
import {
	DEFAULT_LAB,
	TOGGLE_NAMES,
	resolveSettings,
} from "./thought-field-lab.js";

/**
 * @typedef {import("./thought-field-engine.js").Settings} Settings
 * @typedef {import("./thought-field-engine.js").EngineKind} EngineKind
 * @typedef {import("./thought-field-globe.js").SwirlStyle} SwirlStyle
 * @typedef {import("./thought-field-lab-knobs.js").KnobGroup} KnobGroup
 * @typedef {import("./thought-field-lab.js").KnobValues} KnobValues
 * @typedef {import("./thought-field-lab.js").LabState} LabState
 */

/** @typedef {Pick<Storage, "getItem" | "setItem">} LabStorage */

/**
 * @typedef {{
 *   state: () => LabState,
 *   settings: () => Settings,
 *   update: (change: (state: LabState) => LabState) => void,
 * }} LabStore
 */

export const LAB_KEY = "hero-lab-v1";
const VERSION = 1;

/** @type {ReadonlyArray<EngineKind>} */
const ENGINES = ["swirl", "liquid"];
/** @type {ReadonlyArray<SwirlStyle>} */
const STYLES = ["galaxy", "pattern", "off"];
const GROUPS = /** @type {KnobGroup[]} */ (Object.keys(KNOBS));

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function record(value) {
	return typeof value === "object" && value !== null
		? /** @type {Record<string, unknown>} */ (value)
		: {};
}

/**
 * @template {string} T
 * @param {unknown} value
 * @param {ReadonlyArray<T>} options
 * @param {T} fallback
 * @returns {T}
 */
function oneOf(value, options, fallback) {
	return options.find((option) => option === value) ?? fallback;
}

/**
 * @param {unknown} value
 * @returns {LabState["knobs"]}
 */
function savedKnobs(value) {
	const saved = record(value);
	/** @type {(group: KnobGroup) => KnobValues} */
	const group = (name) => {
		const stored = record(saved[name]);
		const defaults = Object.entries(DEFAULT_LAB.knobs[name]);
		return Object.fromEntries(
			defaults.map(([key, fallback]) => {
				const number = stored[key];
				const ok = typeof number === "number" && Number.isFinite(number);
				return [key, ok ? number : fallback];
			}),
		);
	};
	const entries = GROUPS.map((name) => [name, group(name)]);
	return /** @type {LabState["knobs"]} */ (Object.fromEntries(entries));
}

/**
 * @param {unknown} value
 * @returns {LabState["toggles"]}
 */
function savedToggles(value) {
	const saved = record(value);
	const entries = TOGGLE_NAMES.map((name) => {
		const flag = saved[name];
		return [name, typeof flag === "boolean" ? flag : DEFAULT_LAB.toggles[name]];
	});
	return /** @type {LabState["toggles"]} */ (Object.fromEntries(entries));
}

/**
 * The lab state saved as TEXT; defaults for missing, corrupt or older
 * saves, and per field for any value that is out of shape.
 * @param {string | null} text
 * @returns {LabState}
 */
export function parseLab(text) {
	/** @type {unknown} */
	let parsed = null;
	try {
		parsed = JSON.parse(text ?? "null");
	} catch {
		return DEFAULT_LAB;
	}
	const saved = record(parsed);
	if (saved.version !== VERSION) {
		return DEFAULT_LAB;
	}
	return {
		engine: oneOf(saved.engine, ENGINES, DEFAULT_LAB.engine),
		style: oneOf(saved.style, STYLES, DEFAULT_LAB.style),
		toggles: savedToggles(saved.toggles),
		knobs: savedKnobs(saved.knobs),
	};
}

/**
 * @param {LabState} state
 * @returns {string}
 */
export function serializeLab(state) {
	return JSON.stringify({ version: VERSION, ...state });
}

/**
 * The lab state, loaded from STORAGE and saved back on every update.
 * Storage may be null or throw (private mode, full): the lab then
 * still works for this visit.
 * @param {LabStorage | null} storage
 * @returns {LabStore}
 */
export function createLabStore(storage) {
	/** @type {string | null} */
	let saved = null;
	try {
		saved = storage?.getItem(LAB_KEY) ?? null;
	} catch {
		saved = null;
	}
	let state = parseLab(saved);
	let settings = resolveSettings(state);
	/** @param {(state: LabState) => LabState} change */
	const update = (change) => {
		state = change(state);
		settings = resolveSettings(state);
		try {
			storage?.setItem(LAB_KEY, serializeLab(state));
		} catch {
			// Unsaved; the change still applies until the page reloads.
		}
	};
	return { state: () => state, settings: () => settings, update };
}
