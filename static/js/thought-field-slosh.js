// Phone-motion slosh for the hero field: shaking the phone sloshes the
// particles like liquid in a bottle and tilting leans them gently. Pure
// maths, no DOM or sensor APIs, so Node can test it directly.

/** @typedef {{ x: number, y: number }} Vec2 */

/**
 * @typedef {{
 *   shakeGain: number,
 *   deadzone: number,
 *   frequency: number,
 *   damping: number,
 *   tiltLean: number,
 *   tiltRecenter: number,
 *   gravitySmoothing: number,
 *   maxOffset: number,
 *   spread: number,
 * }} SloshTuning
 */

/**
 * `gravity` is a fast low-pass of the reading (m/s², screen axes),
 * `neutral` a slow baseline of gravity (how the phone is normally held),
 * `offset` the unclamped spring displacement in field units and `shown`
 * the soft-limited displacement output on the previous step.
 * @typedef {{
 *   seeded: boolean,
 *   gravity: Vec2,
 *   neutral: Vec2,
 *   offset: Vec2,
 *   velocity: Vec2,
 *   shown: Vec2,
 * }} SloshState
 */

/** @typedef {{ state: SloshState, sample: Vec2 | null, dt: number, tuning: SloshTuning }} SloshStepOptions */

/** @typedef {{ state: SloshState, shift: Vec2, delta: Vec2 }} SloshStep */

/** @typedef {{ offset: Vec2, velocity: Vec2 }} Motion */

/** @typedef {{ lean: Vec2, push: Vec2, omega: number, zeta: number }} Drive */

/** @typedef {{ gravity: Vec2, neutral: Vec2, shake: Vec2, lean: Vec2 }} Filtered */

/** @type {Readonly<SloshTuning>} */
export const SLOSH_TUNING = Object.freeze({
	shakeGain: 2.5, // field units/s² of kick per m/s² of shake
	deadzone: 0.6, // m/s² of shake ignored: hand tremor, walking
	frequency: 1.2, // Hz; how fast the field swings back and forth
	damping: 0.35, // below 1 swings past centre and back; 1 or more settles
	tiltLean: 0.25, // field units of lean per 1 g of tilt from neutral
	tiltRecenter: 4, // s for a held tilt to become the new neutral
	gravitySmoothing: 0.15, // s; longer keeps shake out of the lean but lags tilt
	maxOffset: 0.3, // field units; soft ceiling on the displayed shift
	spread: 0.6, // 0 moves the field as one block; higher moves big particles more
});

const ONE_G = 9.81; // m/s²
const MAX_SUBSTEP = 1 / 120;

// makePoints draws each particle's scale from [0.9, 1.8).
const SCALE_MIDPOINT = 1.35;
const SCALE_HALF_RANGE = 0.45;

/** @type {(x: number, y: number) => Vec2} */
const vec = (x, y) => ({ x, y });

/** @type {(a: Vec2, b: Vec2) => Vec2} */
const add = (a, b) => vec(a.x + b.x, a.y + b.y);

/** @type {(a: Vec2, b: Vec2) => Vec2} */
const sub = (a, b) => vec(a.x - b.x, a.y - b.y);

/** @type {(v: Vec2, k: number) => Vec2} */
const scaled = (v, k) => vec(v.x * k, v.y * k);

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
 * Splits the reading into tilt (the filtered gravity against its
 * neutral baseline) and shake (the reading minus the gravity it had
 * settled on). An unseeded state takes the reading as both, so the
 * first reading from a tilted phone neither kicks nor leans.
 * @param {SloshStepOptions} options
 * @returns {Filtered}
 */
function filterReading({ state, sample, dt, tuning }) {
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
		return { state, shift: { ...state.shown }, delta: vec(0, 0) };
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
	return { state: next, shift: { ...shown }, delta: sub(shown, state.shown) };
}

/**
 * Rotates a device-axes reading into screen axes. ANGLE is
 * screen.orientation.angle in degrees.
 * @param {Vec2} sample
 * @param {number} angle
 * @returns {Vec2}
 */
export function toScreenAxes(sample, angle) {
	const radians = (angle * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return vec(sample.x * cos - sample.y * sin, sample.x * sin + sample.y * cos);
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
