// Snow-globe response to phone motion for the hero field. A shake stirs
// the liquid into swirls; each particle is dragged by its local flow and
// jolted and sunk by its own weight. The swirl style picks the flow: the
// procedural eddies of thought-field-pattern.js, the shake-born vortices
// of thought-field-galaxy.js, or none. Pure maths, no DOM or sensor
// APIs, so Node can test it directly.

import {
	GALAXY_TUNING,
	addGalaxyFlow,
	galaxyAgitation,
	makeGalaxy,
	stepGalaxy,
} from "./thought-field-galaxy.js";
import {
	PATTERN_TUNING,
	makeWaves,
	sampleFlow,
} from "./thought-field-pattern.js";

/**
 * @typedef {import("./thought-field-slosh.js").Vec2} Vec2
 * @typedef {import("./thought-field-particles.js").Field} Field
 * @typedef {import("./thought-field-pattern.js").PatternTuning} PatternTuning
 * @typedef {import("./thought-field-galaxy.js").GalaxyState} GalaxyState
 * @typedef {import("./thought-field-galaxy.js").GalaxyTuning} GalaxyTuning
 */

/** @typedef {"pattern" | "galaxy" | "off"} SwirlStyle */

/**
 * @typedef {{
 *   swirl: SwirlStyle,
 *   shakeStir: number,
 *   viscosity: number,
 *   shakeGain: number,
 *   drag: number,
 *   heavyLag: number,
 *   tiltGain: number,
 *   free: number,
 *   pattern: PatternTuning,
 *   galaxy: GalaxyTuning,
 * }} GlobeTuning
 */

/** @type {Readonly<GlobeTuning>} */
export const GLOBE_TUNING = Object.freeze({
	swirl: "galaxy", // "pattern": fixed eddies; "galaxy": shake-born vortices; "off": no flow
	shakeStir: 0.5, // pattern agitation per m/s of deadzoned shake; a firm 15 m/s², 0.7 s shake fills it
	viscosity: 0.6, // s; time constant for the pattern's swirling to die away
	shakeGain: 1, // field units/s² of jolt per m/s² of deadzoned shake, heaviest flake
	drag: 0.2, // s; how quickly the lightest flake takes up the local flow
	heavyLag: 2, // the heaviest flake's extra drag time, in multiples of drag
	tiltGain: 3, // field units/s² of sinking per field unit of lean, heaviest; low, as long drift can nauseate
	free: 2.5, // how far agitation loosens the pull home; 0 never loosens it
	pattern: PATTERN_TUNING,
	galaxy: GALAXY_TUNING,
});

/**
 * Per-particle velocity and local flow as x, y pairs; the pattern's
 * agitation (0..1) and wave table; and the galaxy's vortices.
 * @typedef {{
 *   energy: number,
 *   galaxy: GalaxyState,
 *   vel: Float32Array,
 *   flow: Float32Array,
 *   waves: Float32Array,
 * }} Globe
 */

/**
 * `shake` (m/s²) and `lean` (field units) as stepSlosh reports them.
 * @typedef {{ shake: Vec2, lean: Vec2 }} GlobeInput
 */

/**
 * `aspect` is the hero's half-width in field units, its half-height 1.
 * @typedef {{
 *   globe: Globe,
 *   field: Field,
 *   input: GlobeInput,
 *   dt: number,
 *   time: number,
 *   aspect: number,
 *   tuning: GlobeTuning,
 * }} GlobeStepOptions
 */

// makePoints draws each particle's scale from [0.9, 1.8).
const SCALE_MIN = 0.9;
const SCALE_RANGE = 0.9;
// Share of the heaviest flake's jolt and sinking that the lightest feels.
const LIGHTEST_SHARE = 0.3;

/**
 * @param {number} count
 * @returns {Globe}
 */
export function makeGlobe(count) {
	return {
		energy: 0,
		galaxy: makeGalaxy(),
		vel: new Float32Array(count * 2),
		flow: new Float32Array(count * 2),
		waves: makeWaves(),
	};
}

/**
 * How strongly each particle is still pulled home: 1 calm, toward 0
 * while the liquid is stirred.
 * @param {number} energy
 * @param {GlobeTuning} tuning
 * @returns {number}
 */
export function homeHold(energy, tuning) {
	return 1 / (1 + energy * tuning.free);
}

/**
 * The active swirl style's agitation, 0 calm to 1; "off" has none.
 * @param {Globe} globe
 * @param {GlobeTuning} tuning
 * @returns {number}
 */
export function globeAgitation(globe, tuning) {
	if (tuning.swirl === "pattern") {
		return globe.energy;
	}
	if (tuning.swirl === "galaxy") {
		return galaxyAgitation(globe.galaxy, tuning.galaxy);
	}
	return 0;
}

/**
 * Pumps the pattern's agitation from shake and lets viscosity drain it.
 * @param {number} energy
 * @param {GlobeInput} input
 * @param {number} dt
 * @param {GlobeTuning} tuning
 * @returns {number}
 */
function stir(energy, input, dt, tuning) {
	const pump = tuning.shakeStir * Math.hypot(input.shake.x, input.shake.y);
	const drained = energy * Math.exp(-dt / tuning.viscosity);
	return Math.min(1, drained + pump * dt);
}

/**
 * Steps the active swirl style and writes its velocity at every particle
 * into `globe.flow`, returning the globe with that style's new state.
 * Only the active style advances; the others keep their state.
 * @param {GlobeStepOptions} options
 * @returns {Globe}
 */
function swirl(options) {
	const { globe, field, input, dt, time, aspect, tuning } = options;
	const { flow, waves } = globe;
	const { pos, count } = field;
	if (tuning.swirl === "pattern") {
		const energy = stir(globe.energy, input, dt, tuning);
		const sweep = { energy, time };
		sampleFlow({ waves, pos, flow, count, sweep, tuning: tuning.pattern });
		return { ...globe, energy };
	}
	flow.fill(0);
	if (tuning.swirl !== "galaxy") {
		return globe;
	}
	const galaxy = stepGalaxy({
		state: globe.galaxy,
		shake: input.shake,
		dt,
		tuning: tuning.galaxy,
		aspect,
	});
	addGalaxyFlow({ state: galaxy, pos, flow, count, tuning: tuning.galaxy });
	return { ...globe, galaxy };
}

/**
 * Jolts, sinks and drags each particle toward its local flow, then moves
 * it. Heavier (larger) flakes feel more jolt and sinking and take up the
 * flow more slowly.
 * @param {GlobeStepOptions} options
 */
function pushParticles(options) {
	const { globe, field, input, dt, tuning } = options;
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
 * Advances the globe by dt seconds, moving `field.pos`, and returns the
 * new globe with how strongly particles are still pulled home.
 * @param {GlobeStepOptions} options
 * @returns {{ globe: Globe, hold: number }}
 */
export function stepGlobe(options) {
	const { globe, dt, tuning } = options;
	if (!(dt > 0)) {
		return { globe, hold: homeHold(globeAgitation(globe, tuning), tuning) };
	}
	const next = swirl(options);
	pushParticles({ ...options, globe: next });
	return { globe: next, hold: homeHold(globeAgitation(next, tuning), tuning) };
}
