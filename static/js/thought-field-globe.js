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
 * The motion filter and the galaxy's vortices, replaced each step, and
 * per-particle velocity and local flow as x, y pairs. stepGlobe writes
 * `vel` and `flow` in place, so a stepped or reseeded globe shares them
 * with the globe it came from: only the newest one is live.
 * @typedef {Readonly<{
 *   filter: FilterState,
 *   galaxy: GalaxyState,
 *   vel: Float32Array,
 *   flow: Float32Array,
 * }>} Globe
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
/**
 * The part of a globe that each substep replaces rather than writes.
 * @typedef {{ filter: FilterState, galaxy: GalaxyState }} Liquid
 */
/**
 * `steps` substeps of `dt` seconds over which the flow is held.
 * @typedef {{ dt: number, steps: number }} Stretch
 */

// Frames are split into steps no longer than this, so the filter, the
// vortex births and the particle drag play out alike at 30 to 144 fps.
const MAX_SUBSTEP = 1 / 240;
// The flow at every particle costs one exp() per vortex, so it is
// sampled once per stretch of up to this long while the drag toward it
// is substepped: once a frame down to 25 fps, twice at the 20 fps cap.
// Holding it a whole 50 ms frame cost 20 fps another 5% of scatter.
const FLOW_STEP = 1 / 25;
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
 * @param {number} dt
 */
function pushParticles(options, input, dt) {
	const { globe, field, tuning } = options;
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
 * Samples the flow once, then runs the stretch's substeps: each filters
 * the reading, sheds and moves the vortices, and pushes the particles.
 * @param {GlobeStepOptions} options
 * @param {Liquid} liquid
 * @param {Stretch} stretch
 * @returns {Liquid}
 */
function advanceStretch(options, liquid, stretch) {
	const { globe, field, sample, aspect, tuning } = options;
	const { pos, count } = field;
	const { flow } = globe;
	const { dt } = stretch;
	flow.fill(0);
	addGalaxyFlow({
		state: liquid.galaxy,
		pos,
		flow,
		count,
		tuning: tuning.galaxy,
	});
	let { filter, galaxy } = liquid;
	for (let i = 0; i < stretch.steps; i += 1) {
		const filtered = filterReading({ state: filter, sample, dt, tuning });
		filter = {
			seeded: filter.seeded || sample !== null,
			gravity: filtered.gravity,
			neutral: filtered.neutral,
		};
		galaxy = stepGalaxy({
			state: galaxy,
			shake: filtered.shake,
			dt,
			tuning: tuning.galaxy,
			aspect,
		});
		pushParticles(options, filtered, dt);
	}
	return { filter, galaxy };
}

/**
 * Advances the globe by dt seconds, moving `field.pos` and writing the
 * globe's buffers in place, and returns the new globe with how strongly
 * particles are still pulled home.
 * @param {GlobeStepOptions} options
 * @returns {{ globe: Globe, hold: number }}
 */
export function stepGlobe(options) {
	const { globe, dt, tuning } = options;
	if (!(dt > 0)) {
		return { globe, hold: homeHold(globe, tuning) };
	}
	const stretches = Math.ceil(dt / FLOW_STEP);
	const steps = Math.ceil(dt / stretches / MAX_SUBSTEP);
	const stretch = { dt: dt / stretches / steps, steps };
	let liquid = { filter: globe.filter, galaxy: globe.galaxy };
	for (let i = 0; i < stretches; i += 1) {
		liquid = advanceStretch(options, liquid, stretch);
	}
	const next = { ...globe, ...liquid };
	return { globe: next, hold: homeHold(next, tuning) };
}
