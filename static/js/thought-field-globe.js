// Snow-globe motion for the hero field on phones. The liquid is a coarse
// fluid simulation; every flake has its own velocity, is dragged by the
// liquid and drags it back, so a shake stirs up independent swirls.

import { shakeBubble } from "./thought-field-bubble.js";
import { moveFlakes } from "./thought-field-flakes.js";
import { fluidSpeed, stepFluid } from "./thought-field-fluid.js";
import { fluidCols, makeFluid } from "./thought-field-grid.js";
import {
	SLOSH_TUNING,
	reseedSlosh,
	restingSlosh,
	stepSlosh,
} from "./thought-field-slosh.js";
import { scaled } from "./thought-field-vec.js";

/**
 * @typedef {import("./thought-field-flakes.js").Flakes} Flakes
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-slosh.js").SloshStep} SloshStep
 * @typedef {import("./thought-field-motion.js").MotionReading} MotionReading
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
 * }} GlobeTuning
 */

/** @typedef {{ fluid: Fluid, flakes: Flakes, dt: number, filtered: SloshStep }} World */

/**
 * `step` advances the liquid and flakes and returns the calm: the share
 * (0..1] of the usual pull back to the layout that still applies.
 * @typedef {{ step: (aspect: number, dt: number) => number, reseed: () => void }} Globe
 */

/** @type {Readonly<GlobeTuning>} */
export const GLOBE_TUNING = Object.freeze({
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
 * One step of liquid and flakes; returns the calm.
 * @param {World} world
 * @param {Readonly<GlobeTuning>} tuning
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
 * Snow-globe physics for FIELD driven by MOTION's readings. The liquid
 * and flake velocities outlive a pause; only the filters re-seed.
 * @param {Field} field
 * @param {{ reading: () => MotionReading | null }} motion
 * @param {Readonly<GlobeTuning>} [tuning]
 * @returns {Globe}
 */
export function createGlobe(field, motion, tuning = GLOBE_TUNING) {
	const { pos, scale, count } = field;
	const flakes = { pos, scale, count, vel: new Float32Array(count * 3) };
	let fluid = makeFluid(fluidCols(1));
	let slosh = restingSlosh();
	let calm = 1;
	/** @type {(aspect: number, dt: number) => number} */
	const step = (aspect, dt) => {
		if (!(dt > 0)) {
			return calm;
		}
		const cols = fluidCols(aspect);
		fluid = cols === fluid.cols ? fluid : makeFluid(cols);
		const filtered = stepSlosh({
			state: slosh,
			sample: motion.reading(),
			dt,
			tuning: SLOSH_TUNING,
		});
		slosh = filtered.state;
		calm = stir({ fluid, flakes, dt, filtered }, tuning);
		return calm;
	};
	const reseed = () => {
		slosh = reseedSlosh(slosh);
	};
	return { step, reseed };
}
