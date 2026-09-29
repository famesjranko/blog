// The hero field's birth: every particle starts as faint haze, scattered
// about its drift position, and condenses onto it as it brightens.
// Particles start at scattered times, so the haze settles gradually.
// Each ends exactly on its drift target at full alpha, where the drift
// takes it over. Pure maths, no DOM or WebGL, so Node can test it.

import { driftTarget } from "./thought-field-particles.js";

/**
 * @typedef {import("./thought-field-particles.js").Field} Field
 * @typedef {{
 *   duration: number,
 *   spread: number,
 *   haze: number,
 *   glow: number,
 * }} BirthTuning
 */

/** @type {Readonly<BirthTuning>} */
export const BIRTH_TUNING = Object.freeze({
	duration: 4, // s from the start to the last hand-off
	spread: 0.5, // share of the duration over which particles start condensing
	haze: 0.45, // field units; farthest a particle starts from its target on each axis
	glow: 0.12, // alpha of a particle still in the haze
});

/**
 * `seeds` holds three values in [0, 1) per particle: when it starts
 * condensing, then its haze offset on x and on y. `age` is the seconds
 * since the birth began; `time` the drift clock.
 * @typedef {{
 *   field: Field,
 *   seeds: Float32Array,
 *   age: number,
 *   aspect: number,
 *   time: number,
 *   tuning: BirthTuning,
 * }} BirthStepOptions
 */

/**
 * @param {number} count
 * @returns {Float32Array}
 */
export function makeSeeds(count) {
	return Float32Array.from({ length: count * 3 }, () => Math.random());
}

/**
 * Places particle I at birth progress U (0 in the haze, 1 on its target).
 * @param {BirthStepOptions} options
 * @param {number} i
 * @param {number} u
 */
function place(options, i, u) {
	const { field, seeds, aspect, time, tuning } = options;
	const target = driftTarget(field, i, aspect, time);
	const left = 2 * tuning.haze * (1 - u) ** 3;
	field.pos[i * 3] = target.x + (seeds[i * 3 + 1] - 0.5) * left;
	field.pos[i * 3 + 1] = target.y + (seeds[i * 3 + 2] - 0.5) * left;
	// Brightens from the moment it starts condensing, quickly at first.
	field.alpha[i] = tuning.glow + (1 - tuning.glow) * (1 - (1 - u) ** 2);
}

/**
 * Writes the position and alpha of every particle still condensing;
 * particles past their birth get full alpha and keep their drift
 * position. Returns false once every particle has been handed over.
 * @param {BirthStepOptions} options
 * @returns {boolean}
 */
export function stepBirth(options) {
	const { field, seeds, age, tuning } = options;
	// Every start is before spread × duration, so every particle is past
	// its span by the duration.
	const span = tuning.duration * (1 - tuning.spread);
	for (let i = 0; i < field.count; i += 1) {
		const start = tuning.spread * tuning.duration * seeds[i * 3];
		const u = (age - start) / span;
		if (u >= 1) {
			field.alpha[i] = 1;
		} else {
			place(options, i, Math.max(0, u));
		}
	}
	return age < tuning.duration;
}
