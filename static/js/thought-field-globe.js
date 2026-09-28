// Snow-globe response to phone motion for the hero field. A shake sheds
// swirling vortices into the liquid (thought-field-galaxy.js); each
// particle is dragged by its local flow and jolted and sunk by its own
// weight. Pure maths, no DOM or sensor APIs, so Node can test it
// directly.

import {
	GALAXY_TUNING,
	addGalaxyFlow,
	galaxyAgitation,
	makeGalaxy,
	stepGalaxy,
} from "./thought-field-galaxy.js";
import { filterReading, restingFilter } from "./thought-field-motion-filter.js";

/**
 * @typedef {import("./thought-field-vec.js").Vec2} Vec2
 * @typedef {import("./thought-field-particles.js").Field} Field
 * @typedef {import("./thought-field-motion-filter.js").FilterState} FilterState
 * @typedef {import("./thought-field-motion-filter.js").FilterTuning} FilterTuning
 * @typedef {import("./thought-field-galaxy.js").GalaxyState} GalaxyState
 * @typedef {import("./thought-field-galaxy.js").GalaxyTuning} GalaxyTuning
 */

/**
 * @typedef {FilterTuning & {
 *   shakeGain: number,
 *   drag: number,
 *   heavyLag: number,
 *   tiltGain: number,
 *   free: number,
 *   galaxy: GalaxyTuning,
 * }} GlobeTuning
 */

/** @type {Readonly<GlobeTuning>} */
export const GLOBE_TUNING = Object.freeze({
	deadzone: 5, // m/s² of shake ignored: tilts read 2.4–5.3 m/s² on a phone; deliberate shakes 20–68
	tiltLean: 0.25, // field units of lean per 1 g of tilt from neutral
	tiltRecenter: 4, // s for a held tilt to become the new neutral
	gravitySmoothing: 0.15, // s; longer keeps shake out of the lean but lags tilt
	shakeGain: 1, // field units/s² of jolt per m/s² of deadzoned shake, heaviest flake
	drag: 0.2, // s; how quickly the lightest flake takes up the local flow
	heavyLag: 2, // the heaviest flake's extra drag time, in multiples of drag
	tiltGain: 3, // field units/s² of sinking per field unit of lean, heaviest; low, as long drift can nauseate
	free: 2.5, // how far agitation loosens the pull home; 0 never loosens it
	galaxy: GALAXY_TUNING,
});

/**
 * The motion filter, the galaxy's vortices, and per-particle velocity
 * and local flow as x, y pairs.
 * @typedef {{
 *   filter: FilterState,
 *   galaxy: GalaxyState,
 *   vel: Float32Array,
 *   flow: Float32Array,
 * }} Globe
 */

/**
 * `sample` is the latest accelerationIncludingGravity in screen axes
 * (m/s²), or null before the first; `aspect` the hero's half-width in
 * field units, its half-height 1.
 * @typedef {{
 *   globe: Globe,
 *   field: Pick<Field, "pos" | "scale" | "count">,
 *   sample: Vec2 | null,
 *   dt: number,
 *   aspect: number,
 *   tuning: GlobeTuning,
 * }} GlobeStepOptions
 */

/** @typedef {{ shake: Vec2, lean: Vec2 }} GlobeInput */

// Frames are split into steps no longer than this, so the filter, the
// vortex births and the particle drag play out alike at 30 to 144 fps.
const MAX_SUBSTEP = 1 / 240;
// makePoints draws each particle's scale from [0.9, 1.8).
const SCALE_MIN = 0.9;
const SCALE_RANGE = 0.9;
// Share of the heaviest flake's jolt and sinking that the lightest feels.
const LIGHTEST_SHARE = 0.3;

/**
 * A resting globe for COUNT particles.
 * @param {number} count
 * @returns {Globe}
 */
export function makeGlobe(count) {
	return {
		filter: restingFilter(),
		galaxy: makeGalaxy(),
		vel: new Float32Array(count * 2),
		flow: new Float32Array(count * 2),
	};
}

/**
 * Keeps the motion but makes the next reading re-seed the filter, so
 * resuming at a new hold angle causes no kick.
 * @param {Globe} globe
 * @returns {Globe}
 */
export function reseedGlobe(globe) {
	return { ...globe, filter: { ...globe.filter, seeded: false } };
}

/**
 * How strongly each particle is still pulled home: 1 calm, toward 0
 * while the liquid swirls.
 * @param {Globe} globe
 * @param {GlobeTuning} tuning
 * @returns {number}
 */
function homeHold(globe, tuning) {
	const agitation = galaxyAgitation(globe.galaxy, tuning.galaxy);
	return 1 / (1 + agitation * tuning.free);
}

/**
 * Jolts, sinks and drags each particle toward its local flow, then moves
 * it. Heavier (larger) flakes feel more jolt and sinking and take up the
 * flow more slowly.
 * @param {GlobeStepOptions} options
 * @param {GlobeInput} input
 */
function pushParticles(options, input) {
	const { globe, field, dt, tuning } = options;
	const { vel, flow } = globe;
	const { pos, scale, count } = field;
	const ax =
		(input.lean.x * tuning.tiltGain - input.shake.x * tuning.shakeGain) * dt;
	const ay =
		(input.lean.y * tuning.tiltGain - input.shake.y * tuning.shakeGain) * dt;
	for (let i = 0; i < count; i += 1) {
		const heavy = (scale[i] - SCALE_MIN) / SCALE_RANGE;
		const share = LIGHTEST_SHARE + (1 - LIGHTEST_SHARE) * heavy;
		const tau = tuning.drag * (1 + tuning.heavyLag * heavy);
		// Implicit drag, stable at any dt without a per-particle exp.
		const pull = dt / (tau + dt);
		const j = i * 2;
		const vx = vel[j] + share * ax;
		const vy = vel[j + 1] + share * ay;
		vel[j] = vx + (flow[j] - vx) * pull;
		vel[j + 1] = vy + (flow[j + 1] - vy) * pull;
		pos[i * 3] += vel[j] * dt;
		pos[i * 3 + 1] += vel[j + 1] * dt;
	}
}

/**
 * One substep: filters the reading, sheds and moves the vortices, then
 * pushes the particles through their flow. Returns the new globe.
 * @param {GlobeStepOptions} options
 * @returns {Globe}
 */
function substep(options) {
	const { globe, field, sample, dt, aspect, tuning } = options;
	const state = globe.filter;
	const filtered = filterReading({ state, sample, dt, tuning });
	const filter = {
		seeded: state.seeded || sample !== null,
		gravity: filtered.gravity,
		neutral: filtered.neutral,
	};
	const galaxy = stepGalaxy({
		state: globe.galaxy,
		shake: filtered.shake,
		dt,
		tuning: tuning.galaxy,
		aspect,
	});
	const { pos, count } = field;
	const { flow } = globe;
	flow.fill(0);
	addGalaxyFlow({ state: galaxy, pos, flow, count, tuning: tuning.galaxy });
	const next = { ...globe, filter, galaxy };
	pushParticles({ ...options, globe: next }, filtered);
	return next;
}

/**
 * Advances the globe by dt seconds, moving `field.pos`, and returns the
 * new globe with how strongly particles are still pulled home.
 * @param {GlobeStepOptions} options
 * @returns {{ globe: Globe, hold: number }}
 */
export function stepGlobe(options) {
	const { dt, tuning } = options;
	const steps = dt > 0 ? Math.ceil(dt / MAX_SUBSTEP) : 0;
	let globe = options.globe;
	for (let i = 0; i < steps; i += 1) {
		globe = substep({ ...options, globe, dt: dt / steps });
	}
	return { globe, hold: homeHold(globe, tuning) };
}
