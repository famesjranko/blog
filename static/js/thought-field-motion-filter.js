// Filter stage of the phone-motion slosh: splits each accelerometer
// reading into shake and tilt lean. Pure maths, no DOM or sensor APIs,
// so Node can test it directly.

import { add, scaled, sub, vec } from "./thought-field-vec.js";

/** @typedef {import("./thought-field-vec.js").Vec2} Vec2 */

/**
 * @typedef {{
 *   deadzone: number,
 *   tiltLean: number,
 *   tiltRecenter: number,
 *   gravitySmoothing: number,
 * }} FilterTuning
 */

/**
 * `gravity` is a fast low-pass of the reading (m/s², screen axes) and
 * `neutral` a slow baseline of gravity (how the phone is normally held).
 * @typedef {{ seeded: boolean, gravity: Vec2, neutral: Vec2 }} FilterState
 */

/** @typedef {{ state: FilterState, sample: Vec2 | null, dt: number, tuning: FilterTuning }} FilterOptions */

/**
 * `shake` is the deadzoned high-pass of the reading (m/s², screen axes)
 * and `lean` the tilt lean in field units.
 * @typedef {{ gravity: Vec2, neutral: Vec2, shake: Vec2, lean: Vec2 }} Filtered
 */

const ONE_G = 9.81; // m/s²

// Fraction of the gap a first-order low-pass closes in dt.
/** @type {(dt: number, timeConstant: number) => number} */
const closes = (dt, timeConstant) => 1 - Math.exp(-dt / timeConstant);

/** @type {(from: Vec2, to: Vec2, amount: number) => Vec2} */
const approach = (from, to, amount) => add(from, scaled(sub(to, from), amount));

/**
 * Shrinks the vector's length by DEADZONE, so the response starts from
 * zero at the threshold instead of jumping.
 * @param {Vec2} shake
 * @param {number} deadzone
 * @returns {Vec2}
 */
function softDeadzone(shake, deadzone) {
	const magnitude = Math.hypot(shake.x, shake.y);
	if (magnitude <= deadzone) {
		return vec(0, 0);
	}
	return scaled(shake, (magnitude - deadzone) / magnitude);
}

/**
 * Splits the reading into tilt (the filtered gravity against its
 * neutral baseline) and shake (the reading minus the gravity it had
 * settled on). An unseeded state takes the reading as both, so the
 * first reading from a tilted phone neither kicks nor leans.
 * @param {FilterOptions} options
 * @returns {Filtered}
 */
export function filterReading({ state, sample, dt, tuning }) {
	if (sample === null) {
		const { gravity, neutral } = state;
		return { gravity, neutral, shake: vec(0, 0), lean: vec(0, 0) };
	}
	const prior = state.seeded ? state : { gravity: sample, neutral: sample };
	const shake = softDeadzone(sub(sample, prior.gravity), tuning.deadzone);
	const fast = closes(dt, tuning.gravitySmoothing);
	const slow = closes(dt, tuning.tiltRecenter);
	const gravity = approach(prior.gravity, sample, fast);
	const neutral = approach(prior.neutral, gravity, slow);
	// The liquid feels the negative of the reading: it pools on the low side.
	const lean = scaled(sub(gravity, neutral), -tuning.tiltLean / ONE_G);
	return { gravity, neutral, shake, lean };
}
