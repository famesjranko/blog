// Phone-motion slosh for the hero field: shaking the phone sloshes the
// particles like liquid in a bottle and tilting leans them gently. The
// filter stage lives in thought-field-motion-filter.js; this module is
// the spring it drives. Pure maths, no DOM or sensor APIs, so Node can
// test it directly.

import { filterReading } from "./thought-field-motion-filter.js";
import { add, scaled, sub, vec } from "./thought-field-vec.js";

/** @typedef {import("./thought-field-vec.js").Vec2} Vec2 */

/**
 * @typedef {import("./thought-field-motion-filter.js").FilterTuning & {
 *   shakeGain: number,
 *   frequency: number,
 *   damping: number,
 *   maxOffset: number,
 *   spread: number,
 * }} SloshTuning
 */

/**
 * The filter state plus the spring: `offset` the unclamped displacement
 * in field units and `shown` the soft-limited displacement output on the
 * previous step.
 * @typedef {import("./thought-field-motion-filter.js").FilterState & {
 *   offset: Vec2,
 *   velocity: Vec2,
 *   shown: Vec2,
 * }} SloshState
 */

/** @typedef {{ state: SloshState, sample: Vec2 | null, dt: number, tuning: SloshTuning }} SloshStepOptions */

/**
 * `shake`, `lean` and `spin` are this step's filter outputs: the
 * deadzoned high-pass of the reading (m/s², screen axes), the tilt lean
 * (field units) the spring pulls toward, and the in-plane twist rate
 * (rad/s, positive counter-clockwise looking at the screen).
 * @typedef {{ state: SloshState, shift: Vec2, delta: Vec2, shake: Vec2, lean: Vec2, spin: number }} SloshStep
 */

/** @typedef {{ offset: Vec2, velocity: Vec2 }} Motion */

/** @typedef {{ lean: Vec2, push: Vec2, omega: number, zeta: number }} Drive */

/** @type {Readonly<SloshTuning>} */
export const SLOSH_TUNING = Object.freeze({
	shakeGain: 2.5, // field units/s² of kick per m/s² of shake
	deadzone: 3, // m/s² of shake ignored: tilting and handling read 3–5 m/s²; a deliberate shake 20+
	frequency: 1.2, // Hz; how fast the field swings back and forth
	damping: 0.35, // below 1 swings past centre and back; 1 or more settles
	tiltLean: 0.25, // field units of lean per 1 g of tilt from neutral
	tiltRecenter: 4, // s for a held tilt to become the new neutral
	gravitySmoothing: 0.15, // s; longer keeps shake out of the lean but lags tilt
	twistFloor: 3, // m/s² of in-plane gravity below which a near-flat phone gives no twist
	twistFull: 6, // m/s² of in-plane gravity from which the twist counts in full
	maxOffset: 0.3, // field units; soft ceiling on the displayed shift
	spread: 0.6, // 0 moves the field as one block; higher moves big particles more
});

const MAX_SUBSTEP = 1 / 120;

// makePoints draws each particle's scale from [0.9, 1.8).
const SCALE_MIDPOINT = 1.35;
const SCALE_HALF_RANGE = 0.45;

/**
 * Limits the vector's length to below MAX with tanh, keeping direction.
 * @param {Vec2} offset
 * @param {number} max
 * @returns {Vec2}
 */
function softLimit(offset, max) {
	const magnitude = Math.hypot(offset.x, offset.y);
	if (magnitude === 0) {
		return vec(0, 0);
	}
	return scaled(offset, (max * Math.tanh(magnitude / max)) / magnitude);
}

/**
 * One semi-implicit Euler step of the damped spring toward the lean.
 * @param {Motion} motion
 * @param {Drive} drive
 * @param {number} h
 * @returns {Motion}
 */
function springStep(motion, drive, h) {
	const { omega, zeta } = drive;
	const pull = scaled(sub(motion.offset, drive.lean), -omega * omega);
	const drag = scaled(motion.velocity, -2 * zeta * omega);
	const accel = add(add(pull, drag), drive.push);
	const velocity = add(motion.velocity, scaled(accel, h));
	return { offset: add(motion.offset, scaled(velocity, h)), velocity };
}

/**
 * Equal substeps no longer than MAX_SUBSTEP keep the spring stable at
 * stiff tunings when a slow frame hands over a long dt.
 * @param {Motion} motion
 * @param {Drive} drive
 * @param {number} dt
 * @returns {Motion}
 */
function integrate(motion, drive, dt) {
	const steps = Math.ceil(dt / MAX_SUBSTEP);
	const h = dt / steps;
	return Array.from({ length: steps }).reduce(
		(/** @type {Motion} */ current) => springStep(current, drive, h),
		motion,
	);
}

/** @returns {SloshState} */
export function restingSlosh() {
	return {
		seeded: false,
		gravity: vec(0, 0),
		neutral: vec(0, 0),
		offset: vec(0, 0),
		velocity: vec(0, 0),
		shown: vec(0, 0),
	};
}

/**
 * Keeps the motion but makes the next reading re-seed the filters, so
 * resuming at a new hold angle causes no kick.
 * @param {SloshState} state
 * @returns {SloshState}
 */
export function reseedSlosh(state) {
	return { ...state, seeded: false };
}

/**
 * Advances the slosh by dt seconds. SAMPLE is accelerationIncludingGravity
 * in screen axes (m/s²), or null when there is no reading.
 * @param {SloshStepOptions} options
 * @returns {SloshStep}
 */
export function stepSlosh({ state, sample, dt, tuning }) {
	if (!(dt > 0)) {
		const shift = { ...state.shown };
		const [delta, shake, lean] = [vec(0, 0), vec(0, 0), vec(0, 0)];
		return { state, shift, delta, shake, lean, spin: 0 };
	}
	const filtered = filterReading({ state, sample, dt, tuning });
	const drive = {
		lean: filtered.lean,
		// Negated like the lean: jolted right, the liquid is left behind.
		push: scaled(filtered.shake, -tuning.shakeGain),
		omega: 2 * Math.PI * tuning.frequency,
		zeta: tuning.damping,
	};
	const motion = integrate(state, drive, dt);
	const shown = softLimit(motion.offset, tuning.maxOffset);
	const next = {
		seeded: state.seeded || sample !== null,
		gravity: filtered.gravity,
		neutral: filtered.neutral,
		offset: motion.offset,
		velocity: motion.velocity,
		shown,
	};
	return {
		state: next,
		shift: { ...shown },
		delta: sub(shown, state.shown),
		shake: filtered.shake,
		lean: filtered.lean,
		spin: filtered.spin,
	};
}

/**
 * How far a particle of the given scale moves relative to the field's
 * shift: 1 at mid scale, 1 ± spread at the extremes.
 * @param {number} scale
 * @param {number} spread
 * @returns {number}
 */
export function sloshWeight(scale, spread) {
	return 1 + (spread * (scale - SCALE_MIDPOINT)) / SCALE_HALF_RANGE;
}
