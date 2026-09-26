// Picks the hero's snow-globe engine each frame: prototype A's swirl
// (thought-field-globe.js) or prototype B's liquid
// (thought-field-liquid.js). Both move `field.pos` in place, so a switch
// hands the particles over where they are, starting the new engine from
// rest.

import { GLOBE_TUNING, makeGlobe, stepGlobe } from "./thought-field-globe.js";
import {
	LIQUID_TUNING,
	makeLiquid,
	stepLiquid,
} from "./thought-field-liquid.js";
import { SLOSH_TUNING } from "./thought-field-slosh.js";

/**
 * @typedef {import("./thought-field-globe.js").Globe} Globe
 * @typedef {import("./thought-field-globe.js").GlobeTuning} GlobeTuning
 * @typedef {import("./thought-field-liquid.js").Liquid} Liquid
 * @typedef {import("./thought-field-liquid.js").LiquidTuning} LiquidTuning
 * @typedef {import("./thought-field-slosh.js").SloshStep} SloshStep
 * @typedef {import("./thought-field-slosh.js").SloshTuning} SloshTuning
 * @typedef {import("./thought-field-particles.js").Field} Field
 */

/** @typedef {"swirl" | "liquid"} EngineKind */

/**
 * Everything the physics reads each frame.
 * @typedef {{
 *   engine: EngineKind,
 *   slosh: SloshTuning,
 *   swirl: GlobeTuning,
 *   liquid: LiquidTuning,
 * }} Settings
 */

/** @typedef {{ kind: "swirl", globe: Globe } | { kind: "liquid", liquid: Liquid }} Engine */

/**
 * `filtered` is this frame's stepSlosh output; `aspect` the hero's width
 * over height.
 * @typedef {{
 *   engine: Engine,
 *   settings: Settings,
 *   field: Pick<Field, "pos" | "scale" | "count">,
 *   filtered: SloshStep,
 *   dt: number,
 *   time: number,
 *   aspect: number,
 * }} EngineStepOptions
 */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
	engine: /** @type {EngineKind} */ ("swirl"),
	slosh: SLOSH_TUNING,
	swirl: GLOBE_TUNING,
	liquid: LIQUID_TUNING,
});

/**
 * A resting engine of KIND for COUNT particles.
 * @param {EngineKind} kind
 * @param {number} count
 * @returns {Engine}
 */
export function makeEngine(kind, count) {
	if (kind === "liquid") {
		return { kind, liquid: makeLiquid(count) };
	}
	return { kind, globe: makeGlobe(count) };
}

/**
 * Steps the engine the settings select, first replacing the current one
 * with a resting engine if the selection changed. Returns the engine and
 * how strongly particles are still pulled home.
 * @param {EngineStepOptions} options
 * @returns {{ engine: Engine, hold: number }}
 */
export function stepEngine(options) {
	const { settings, field, filtered, dt, time, aspect } = options;
	const engine =
		options.engine.kind === settings.engine
			? options.engine
			: makeEngine(settings.engine, field.count);
	if (engine.kind === "liquid") {
		const tuning = settings.liquid;
		const moved = stepLiquid({ ...options, liquid: engine.liquid, tuning });
		return {
			engine: { kind: "liquid", liquid: moved.liquid },
			hold: moved.hold,
		};
	}
	const input = { shake: filtered.shake, lean: filtered.lean };
	const moved = stepGlobe({
		globe: engine.globe,
		field,
		input,
		dt,
		time,
		aspect,
		tuning: settings.swirl,
	});
	return { engine: { kind: "swirl", globe: moved.globe }, hold: moved.hold };
}
