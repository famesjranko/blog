// Slider ranges for the ?tune lab: min, max, step and unit per knob,
// grouped by the tuning object each knob lives in. The label is the
// knob's own key, so a copied JSON reads the same as the panel. Ranges
// run from 0 to about 3× the default, floored where 0 would divide by
// zero or, for `spread`, turn a flake's weight negative.

/** @typedef {"slosh" | "swirl" | "pattern" | "galaxy" | "liquid"} KnobGroup */
/** @typedef {readonly [number, number, number, string]} Knob */
/** @typedef {"lag" | "tilt" | "liquid" | "bubble"} ToggleName */
/** @typedef {{ label: string, knobs: ReadonlyArray<readonly [KnobGroup, string]> }} Toggle */

/** @type {Readonly<Record<KnobGroup, Readonly<Record<string, Knob>>>>} */
export const KNOBS = Object.freeze({
	slosh: {
		deadzone: [0, 15, 0.5, "m/s²"],
		tiltLean: [0, 0.75, 0.01, "u/g"],
		tiltRecenter: [0.5, 12, 0.5, "s"],
		gravitySmoothing: [0.01, 0.5, 0.01, "s"],
	},
	swirl: {
		shakeStir: [0, 1.5, 0.05, "per m/s"],
		viscosity: [0.05, 2, 0.05, "s"],
		shakeGain: [0, 3, 0.05, "u/s² per m/s²"],
		drag: [0.01, 0.6, 0.01, "s"],
		heavyLag: [0, 6, 0.1, "× drag"],
		tiltGain: [0, 9, 0.1, "1/s²"],
		free: [0, 7.5, 0.1, ""],
	},
	pattern: {
		swirlSpeed: [0, 2, 0.05, "u/s"],
		eddySize: [0.1, 1.8, 0.05, "u"],
		eddyDrift: [0, 1.2, 0.05, "rad/s"],
	},
	galaxy: {
		strength: [0, 3, 0.05, "u²/s per m/s"],
		core: [0.02, 0.36, 0.01, "u"],
		spacing: [0, 1.2, 0.02, "u"],
		jitter: [0, 0.75, 0.01, "u"],
		quantum: [0.05, 1.05, 0.05, "m/s"],
		cooldown: [0, 0.75, 0.01, "s"],
		memory: [0.01, 0.3, 0.01, "s"],
		decay: [0.1, 2.4, 0.05, "s"],
		spread: [0, 0.018, 0.001, "u²/s"],
		spiral: [0, 0.45, 0.01, ""],
		full: [0.5, 12, 0.5, "u²/s"],
		maxWells: [0, 24, 2, "wells"],
	},
	liquid: {
		shakeGain: [0, 8, 0.1, "u/s² per m/s²"],
		tiltGain: [0, 6, 0.1, "1/s²"],
		drag: [0.02, 1, 0.01, "s"],
		spread: [0, 0.9, 0.05, ""],
		coupling: [0, 18, 0.5, "mass ratio"],
		viscosity: [0, 0.03, 0.001, "u²/s"],
		glassDrag: [0.01, 0.3, 0.01, "s"],
		bubble: [0, 3, 0.05, "share"],
		free: [0, 9, 0.1, "s/u"],
	},
});

/**
 * Ingredient switches: off overrides each listed knob to 0, keeping the
 * slider's value for when it is switched back on.
 * @type {Readonly<Record<ToggleName, Toggle>>}
 */
export const TOGGLES = Object.freeze({
	lag: {
		label: "particle lag",
		knobs: [
			["swirl", "shakeGain"],
			["liquid", "shakeGain"],
		],
	},
	tilt: {
		label: "tilt drift",
		knobs: [
			["swirl", "tiltGain"],
			["liquid", "tiltGain"],
		],
	},
	liquid: { label: "liquid", knobs: [["liquid", "coupling"]] },
	bubble: { label: "air bubble", knobs: [["liquid", "bubble"]] },
});
