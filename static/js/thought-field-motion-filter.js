// Filter stage of the phone-motion slosh: splits each accelerometer
// reading into shake, tilt lean and in-plane twist. Pure maths, no DOM
// or sensor APIs, so Node can test it directly.

import { add, cross, dot, scaled, sub, vec } from "./thought-field-vec.js";

/** @typedef {import("./thought-field-vec.js").Vec2} Vec2 */

/**
 * @typedef {{
 *   deadzone: number,
 *   tiltLean: number,
 *   tiltRecenter: number,
 *   gravitySmoothing: number,
 *   twistFloor: number,
 *   twistFull: number,
 * }} FilterTuning
 */

/**
 * `gravity` is a fast low-pass of the reading (m/s², screen axes) and
 * `neutral` a slow baseline of gravity (how the phone is normally held).
 * @typedef {{ seeded: boolean, gravity: Vec2, neutral: Vec2 }} FilterState
 */

/** @typedef {{ state: FilterState, sample: Vec2 | null, dt: number, tuning: FilterTuning }} FilterOptions */

/**
 * `shake` is the deadzoned high-pass of the reading (m/s², screen axes),
 * `lean` the tilt lean in field units and `spin` the in-plane twist rate
 * in rad/s, positive counter-clockwise looking at the screen.
 * @typedef {{ gravity: Vec2, neutral: Vec2, shake: Vec2, lean: Vec2, spin: number }} Filtered
 */

/** @typedef {{ from: Vec2, to: Vec2, dt: number, tuning: FilterTuning }} TwistOptions */

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
 * Smoothstep from 0 at or below FLOOR to 1 at or above FULL.
 * @param {number} value
 * @param {number} floor
 * @param {number} full
 * @returns {number}
 */
function ramp(value, floor, full) {
	const t = Math.min(1, Math.max(0, (value - floor) / (full - floor)));
	return t * t * (3 - 2 * t);
}

/**
 * The twist rate from the turn of the filtered gravity between steps.
 * Gravity's in-plane angle, unlike the gyroscope's axes, means the same
 * thing in every browser. The reaction turns against the phone, hence
 * the minus. Fades out as the phone nears flat, where the angle is noise.
 * @param {TwistOptions} options
 * @returns {number}
 */
function twistRate({ from, to, dt, tuning }) {
	if (!(dt > 0)) {
		return 0;
	}
	// atan2 of cross and dot is the signed angle between them, free of the ±π wrap.
	const turned = Math.atan2(cross(from, to), dot(from, to));
	const inPlane = Math.hypot(to.x, to.y);
	return (-turned / dt) * ramp(inPlane, tuning.twistFloor, tuning.twistFull);
}

/**
 * Splits the reading into tilt (the filtered gravity against its
 * neutral baseline), shake (the reading minus the gravity it had
 * settled on) and twist (the turn of the filtered gravity). An unseeded
 * state takes the reading as both, so the first reading from a tilted
 * or turned phone neither kicks, leans nor spins.
 * @param {FilterOptions} options
 * @returns {Filtered}
 */
export function filterReading({ state, sample, dt, tuning }) {
	if (sample === null) {
		const { gravity, neutral } = state;
		return { gravity, neutral, shake: vec(0, 0), lean: vec(0, 0), spin: 0 };
	}
	const prior = state.seeded ? state : { gravity: sample, neutral: sample };
	const shake = softDeadzone(sub(sample, prior.gravity), tuning.deadzone);
	const fast = closes(dt, tuning.gravitySmoothing);
	const slow = closes(dt, tuning.tiltRecenter);
	const gravity = approach(prior.gravity, sample, fast);
	const neutral = approach(prior.neutral, gravity, slow);
	// The liquid feels the negative of the reading: it pools on the low side.
	const lean = scaled(sub(gravity, neutral), -tuning.tiltLean / ONE_G);
	const spin = twistRate({ from: prior.gravity, to: gravity, dt, tuning });
	return { gravity, neutral, shake, lean, spin };
}
