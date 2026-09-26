// Presets for the ?tune lab: named starting points to click through and
// compare. Each lists only what differs from the defaults; applying one
// replaces the whole lab state with the defaults under it. Tilt drift
// stays gentle in all of them, at or below each engine's default, as
// long drift can nauseate. No DOM, so Node can test it.

import { KNOBS } from "./thought-field-lab-knobs.js";
import { DEFAULT_LAB, markLoaded } from "./thought-field-lab.js";

/**
 * @typedef {import("./thought-field-engine.js").EngineKind} EngineKind
 * @typedef {import("./thought-field-globe.js").SwirlStyle} SwirlStyle
 * @typedef {import("./thought-field-lab-knobs.js").KnobGroup} KnobGroup
 * @typedef {import("./thought-field-lab-knobs.js").ToggleName} ToggleName
 * @typedef {import("./thought-field-lab.js").KnobValues} KnobValues
 * @typedef {import("./thought-field-lab.js").LabState} LabState
 */

/**
 * @typedef {{
 *   name: string,
 *   engine: EngineKind,
 *   style?: SwirlStyle,
 *   toggles?: Partial<Record<ToggleName, boolean>>,
 *   knobs?: Partial<Record<KnobGroup, KnobValues>>,
 * }} Preset
 */

/** @type {ReadonlyArray<Readonly<Preset>>} */
export const PRESETS = [
	{
		// No liquid: each flake only lags the shake and settles.
		name: "Calm drift",
		engine: "liquid",
		toggles: { liquid: false, bubble: false },
		knobs: { liquid: { shakeGain: 1.7, tiltGain: 1, drag: 0.2 } },
	},
	{
		// B one notch calmer: flakes stir the liquid less.
		name: "Snow globe",
		engine: "liquid",
		knobs: { liquid: { coupling: 4, shakeGain: 2, tiltGain: 1.5 } },
	},
	{
		// Heavy, slow liquid: lazy motion and a long settle.
		name: "Thick syrup",
		engine: "liquid",
		knobs: {
			liquid: {
				shakeGain: 1.3,
				tiltGain: 1,
				drag: 0.5,
				viscosity: 0.026,
				glassDrag: 0.2,
			},
		},
	},
	{
		// Deliberately dramatic: thin liquid the flakes whip into swirls.
		name: "Stormy water",
		engine: "liquid",
		knobs: {
			liquid: {
				shakeGain: 3.5,
				coupling: 12,
				bubble: 2,
				viscosity: 0.004,
				glassDrag: 0.06,
			},
		},
	},
	{
		// A's defaults.
		name: "Galaxy",
		engine: "swirl",
		style: "galaxy",
	},
	{
		// Stronger, longer-lived whirlpools winding flakes into arms.
		name: "Spiral galaxy",
		engine: "swirl",
		style: "galaxy",
		knobs: {
			galaxy: { strength: 1.4, core: 0.15, decay: 1.3, spiral: 0.32 },
		},
	},
	{
		// Big, slow, cloud-like eddies; a shake stirs them a little less,
		// so their long fade still settles in about six seconds.
		name: "Nebula",
		engine: "swirl",
		style: "pattern",
		knobs: {
			swirl: { shakeStir: 0.35, viscosity: 1.1, tiltGain: 2 },
			pattern: { swirlSpeed: 0.45, eddySize: 1.2, eddyDrift: 0.2 },
		},
	},
	{
		// No flow: light flakes stop at once, heavy ones coast.
		name: "Glitter",
		engine: "swirl",
		style: "off",
		knobs: {
			swirl: { shakeGain: 1.4, drag: 0.08, heavyLag: 4.5, tiltGain: 2 },
		},
	},
];

const GROUPS = /** @type {KnobGroup[]} */ (Object.keys(KNOBS));

/**
 * The lab state PRESET selects: the defaults under its overrides,
 * whatever the state was before.
 * @param {Readonly<Preset>} preset
 * @returns {LabState}
 */
export function presetState(preset) {
	const knobs = GROUPS.map((group) => [
		group,
		{ ...DEFAULT_LAB.knobs[group], ...preset.knobs?.[group] },
	]);
	const state = {
		...DEFAULT_LAB,
		engine: preset.engine,
		style: preset.style ?? DEFAULT_LAB.style,
		toggles: { ...DEFAULT_LAB.toggles, ...preset.toggles },
		knobs: /** @type {LabState["knobs"]} */ (Object.fromEntries(knobs)),
	};
	return markLoaded(state, preset.name);
}
