// Snow-globe motion for the hero field on phones. The liquid is a coarse
// fluid simulation; every flake has its own velocity, is dragged by the
// liquid and drags it back, so a shake stirs up independent swirls.

import { shakeBubble } from "./thought-field-bubble.js";
import { moveFlakes } from "./thought-field-flakes.js";
import { fluidSpeed, stepFluid } from "./thought-field-fluid.js";
import { fluidCols, makeFluid } from "./thought-field-grid.js";
import { scaled } from "./thought-field-vec.js";

/**
 * @typedef {import("./thought-field-flakes.js").Flakes} Flakes
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-slosh.js").SloshStep} SloshStep
 * @typedef {import("./thought-field-particles.js").Field} Field
 */

/**
 * @typedef {{
 *   shakeGain: number,
 *   tiltGain: number,
 *   drag: number,
 *   spread: number,
 *   coupling: number,
 *   viscosity: number,
 *   glassDrag: number,
 *   bubble: number,
 *   free: number,
 * }} LiquidTuning
 */

/**
 * The liquid, the flakes' velocities (stride 3, like `pos`) and the hold
 * the last step reported. The grid and velocities are mutated in place.
 * @typedef {{ fluid: Fluid, vel: Float32Array, hold: number }} Liquid
 */

/**
 * `filtered` is this frame's stepSlosh output; `aspect` the hero's
 * width over height.
 * @typedef {{
 *   liquid: Liquid,
 *   field: Pick<Field, "pos" | "scale" | "count">,
 *   filtered: SloshStep,
 *   dt: number,
 *   aspect: number,
 *   tuning: LiquidTuning,
 * }} LiquidStepOptions
 */

/** @typedef {{ fluid: Fluid, flakes: Flakes, dt: number, filtered: SloshStep }} World */

/** @type {Readonly<LiquidTuning>} */
export const LIQUID_TUNING = Object.freeze({
	shakeGain: 2.6, // field units/s² a mid-weight flake is jolted per m/s² of shake
	tiltGain: 2, // 1/s²; settling acceleration per field unit of lean
	drag: 0.3, // s; how quickly a mid-weight flake catches up with the liquid
	spread: 0.4, // flakes weigh 1 ± spread by size: heavier lags, sinks, slips more
	coupling: 6, // total flake mass over liquid mass: how hard flakes stir it
	viscosity: 0.01, // field units²/s; higher calms small swirls sooner
	glassDrag: 0.1, // s for the glass to stop bare liquid; the flakes' momentum makes a stir last ~(1 + coupling) times longer
	bubble: 1, // share of a shake the top of the liquid takes; 0 = brim-full
	free: 3, // s per field unit: how far motion loosens the pull to the layout
});

/**
 * One step of liquid and flakes; returns the hold: the share (0..1] of
 * the usual pull back to the layout that still applies.
 * @param {World} world
 * @param {Readonly<LiquidTuning>} tuning
 * @returns {number}
 */
function stir({ fluid, flakes, dt, filtered }, tuning) {
	const cells = fluid.cols * fluid.rows;
	const flakeSpeed = moveFlakes(flakes, {
		fluid,
		dt,
		jolt: scaled(filtered.shake, -tuning.shakeGain),
		sink: scaled(filtered.lean, tuning.tiltGain),
		drag: tuning.drag,
		spread: tuning.spread,
		mass: (tuning.coupling * cells) / Math.max(1, flakes.count),
	});
	shakeBubble(fluid, {
		shake: filtered.shake,
		gravity: filtered.state.gravity,
		gain: tuning.shakeGain * tuning.bubble,
	});
	const { viscosity, glassDrag } = tuning;
	stepFluid(fluid, { dt, viscosity, glassDrag });
	return 1 / (1 + tuning.free * (fluidSpeed(fluid) + flakeSpeed));
}

/**
 * A still liquid and resting flakes for COUNT particles.
 * @param {number} count
 * @returns {Liquid}
 */
export function makeLiquid(count) {
	return {
		fluid: makeFluid(fluidCols(1)),
		vel: new Float32Array(count * 3),
		hold: 1,
	};
}

/**
 * Advances the liquid and flakes by dt, moving `field.pos`, and returns
 * the new liquid with how strongly particles are still pulled home.
 * @param {LiquidStepOptions} options
 * @returns {{ liquid: Liquid, hold: number }}
 */
export function stepLiquid(options) {
	const { liquid, field, filtered, dt, aspect, tuning } = options;
	if (!(dt > 0)) {
		return { liquid, hold: liquid.hold };
	}
	const cols = fluidCols(aspect);
	const fluid = cols === liquid.fluid.cols ? liquid.fluid : makeFluid(cols);
	const { pos, scale, count } = field;
	const flakes = { pos, scale, count, vel: liquid.vel };
	const hold = stir({ fluid, flakes, dt, filtered }, tuning);
	return { liquid: { fluid, vel: liquid.vel, hold }, hold };
}
