// Snow-globe motion for the hero field on phones. The liquid is a coarse
// fluid simulation; every flake has its own velocity, is dragged by the
// liquid and drags it back, so a shake stirs up independent swirls.

import { moveFlakes } from "./thought-field-flakes.js";
import { fluidSpeed, stepFluid } from "./thought-field-fluid.js";
import { fluidCols, makeFluid } from "./thought-field-grid.js";
import {
	SLOSH_TUNING,
	reseedSlosh,
	restingSlosh,
	stepSlosh,
} from "./thought-field-slosh.js";
import { shakeFluid, twistFluid } from "./thought-field-stir.js";

/**
 * @typedef {import("./thought-field-flakes.js").Flakes} Flakes
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-slosh.js").Vec2} Vec2
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
 *   twistGain: number,
 *   spinSmoothing: number,
 *   spinDeadzone: number,
 *   bubble: number,
 *   free: number,
 * }} GlobeTuning
 */

/** @typedef {{ value: number, seeded: boolean }} Spin */

/**
 * One step's state and inputs: `spin` (rad/s) is the phone's smoothed
 * turning rate and `spinUp` (rad/s) its change since the last step.
 * @typedef {{
 *   fluid: Fluid,
 *   flakes: Flakes,
 *   dt: number,
 *   filtered: SloshStep,
 *   spinUp: number,
 *   spin: number,
 * }} World
 */

/**
 * `step` advances the liquid and flakes and returns the calm: the share
 * (0..1] of the usual pull back to the layout that still applies.
 * @typedef {{ step: (aspect: number, dt: number) => number, reseed: () => void }} Globe
 */

/** @type {Readonly<GlobeTuning>} */
export const GLOBE_TUNING = Object.freeze({
	shakeGain: 2, // field units/s² a mid-weight flake is jolted per m/s² of shake
	tiltGain: 4, // 1/s²; settling acceleration per field unit of lean
	drag: 0.3, // s; how quickly a mid-weight flake catches up with the liquid
	spread: 0.4, // flakes weigh 1 ± spread by size: heavier lags, sinks, slips more
	coupling: 3, // total flake mass over liquid mass: how hard flakes stir it
	viscosity: 0.02, // field units²/s; higher calms small swirls sooner
	glassDrag: 0.7, // s for the front and back glass to stop the liquid
	twistGain: 0.7, // 1 = the liquid lags a twist fully; less = walls drag it along
	spinSmoothing: 0.05, // s; low-pass on the gyroscope before differencing
	spinDeadzone: 0.2, // rad/s of twist ignored: walking, hand wobble
	bubble: 0.3, // share of a shake the top of the liquid takes; 0 = brim-full
	free: 3, // s per field unit: how far motion loosens the pull to the layout
});

const ONE_G = 9.81; // m/s²

/** @type {(v: Vec2, k: number) => Vec2} */
const scaled = (v, k) => ({ x: v.x * k, y: v.y * k });

/** @type {(value: number, deadzone: number) => number} */
const softDeadzone = (value, deadzone) =>
	Math.sign(value) * Math.max(0, Math.abs(value) - deadzone);

/**
 * The part-full globe's push: the shake across UP, the in-plane way
 * away from gravity, weaker as the phone lies flatter. Null when flat.
 * @param {Vec2} shake m/s²
 * @param {Vec2} gravity the settled reading, m/s², pointing up
 * @param {Readonly<GlobeTuning>} tuning
 * @returns {{ push: Vec2, up: Vec2 } | null}
 */
function bubblePush(shake, gravity, tuning) {
	const g = Math.hypot(gravity.x, gravity.y);
	if (g < 0.01 || tuning.bubble === 0) {
		return null;
	}
	const up = scaled(gravity, 1 / g);
	const along = shake.x * up.x + shake.y * up.y;
	const across = { x: shake.x - along * up.x, y: shake.y - along * up.y };
	const k = -tuning.shakeGain * tuning.bubble * Math.min(1, g / ONE_G);
	return { push: scaled(across, k), up };
}

/**
 * The gyroscope's twist rate, deadzoned and smoothed (rad/s), and
 * whether there was a reading to smooth from.
 * @param {Spin} spin
 * @param {MotionReading | null} reading
 * @param {number} dt
 * @param {Readonly<GlobeTuning>} tuning
 * @returns {Spin}
 */
function nextSpin(spin, reading, dt, tuning) {
	const raw = softDeadzone(reading?.spin ?? 0, tuning.spinDeadzone);
	const eased = 1 - Math.exp(-dt / tuning.spinSmoothing);
	const value = spin.seeded ? spin.value + (raw - spin.value) * eased : raw;
	return { value, seeded: reading !== null };
}

/**
 * One step of liquid and flakes; returns the calm.
 * @param {World} world
 * @param {Readonly<GlobeTuning>} tuning
 * @returns {number}
 */
function stir(world, tuning) {
	const { fluid, flakes, dt, filtered } = world;
	const spinUp = world.spinUp * tuning.twistGain;
	const spin = world.spin * tuning.twistGain;
	twistFluid(fluid, { spinUp, spin, dt });
	const cells = fluid.cols * fluid.rows;
	const flakeSpeed = moveFlakes(flakes, {
		fluid,
		dt,
		jolt: scaled(filtered.shake, -tuning.shakeGain),
		sink: scaled(filtered.lean, tuning.tiltGain),
		spinUp,
		cos: Math.cos(2 * spin * dt),
		sin: Math.sin(2 * spin * dt),
		spinSq: spin * spin,
		drag: tuning.drag,
		spread: tuning.spread,
		share: (tuning.coupling * cells) / (Math.max(1, flakes.count) * dt),
	});
	const bubble = bubblePush(filtered.shake, filtered.state.gravity, tuning);
	if (bubble !== null) {
		shakeFluid(fluid, bubble.push, bubble.up);
	}
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
	/** @type {Spin} */
	let spin = { value: 0, seeded: false };
	let calm = 1;
	/** @type {(aspect: number, dt: number) => number} */
	const step = (aspect, dt) => {
		if (!(dt > 0)) {
			return calm;
		}
		const cols = fluidCols(aspect);
		fluid = cols === fluid.cols ? fluid : makeFluid(cols);
		const reading = motion.reading();
		const filtered = stepSlosh({
			state: slosh,
			sample: reading,
			dt,
			tuning: SLOSH_TUNING,
		});
		const spun = nextSpin(spin, reading, dt, tuning);
		const spinUp = spin.seeded ? spun.value - spin.value : 0;
		slosh = filtered.state;
		spin = spun;
		const world = { fluid, flakes, dt, filtered, spinUp, spin: spun.value };
		calm = stir(world, tuning);
		return calm;
	};
	const reseed = () => {
		slosh = reseedSlosh(slosh);
		spin = { value: spin.value, seeded: false };
	};
	return { step, reseed };
}
