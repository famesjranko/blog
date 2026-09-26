// Galaxy swirl for the snow-globe hero. Each shake stroke sheds a
// counter-rotating pair of smooth-cored (Lamb–Oseen) vortices, "wells",
// whose jet runs against the jolt, as the liquid lags the glass. The
// wells carry one another about, fade and spread, and their differential
// rotation shears the particles into spiral arms. The well physics is in
// thought-field-wells.js. Pure maths, no DOM or sensor APIs, so Node can
// test it directly.

import { add, scaled, sub, vec } from "./thought-field-vec.js";
import { clamp, evolveWells, swirlRate } from "./thought-field-wells.js";

/**
 * @typedef {import("./thought-field-vec.js").Vec2} Vec2
 * @typedef {import("./thought-field-wells.js").Well} Well
 */

/**
 * @typedef {{
 *   strength: number,
 *   core: number,
 *   spacing: number,
 *   jitter: number,
 *   quantum: number,
 *   cooldown: number,
 *   memory: number,
 *   decay: number,
 *   spread: number,
 *   spiral: number,
 *   full: number,
 *   maxWells: number,
 * }} GalaxyTuning
 */

// Field units: the hero is 2 tall and 2 × aspect wide (1.3 on a phone).
// Past the filters, a firm 15 m/s², 3 Hz, 0.7 s shake delivers ~3.2 m/s
// of |shake| impulse, ~1.1 m/s per cooldown; a gentle 8 m/s² one ~0.65.
/** @type {Readonly<GalaxyTuning>} */
export const GALAXY_TUNING = Object.freeze({
	strength: 1, // field units²/s of circulation per m/s of impulse; a firm stroke's Γ ≈ 1.1 jets 1.6 field units/s between the pair
	core: 0.12, // field units; core radius at birth, well inside spacing / 2 so the jet forms between two distinct cores
	spacing: 0.4, // field units between a pair's cores; a fifth of the hero height, a third of a phone's width
	jitter: 0.25, // field units; birth midpoints scatter over this disc, so pairs (±0.2) stay inside the ±0.65 phone width
	quantum: 0.35, // m/s of impulse per pair; the gentle shake's ~0.65 m/s, leaking, makes one
	cooldown: 0.25, // s between pairs; a firm 0.7 s shake makes three
	memory: 0.1, // s; the stroke direction's memory, about half a 3 Hz stroke, so back-and-forth strokes do not cancel
	decay: 0.8, // s; circulation e-folding time, and the unspent impulse's; a firm shake's wells are gone in ~3 s
	spread: 0.006, // field units²/s; core diffusion ν, a² = core² + 4ν·age: the core ~doubles in 2 s
	spiral: 0.15, // inward drift per unit swirl speed: arms pitched atan(0.15) ≈ 9°, loosely wound
	full: 4, // field units²/s; summed |circulation| that counts as full agitation, about a firm shake's three pairs
	maxWells: 8, // at most four pairs; each particle then costs eight exp() a frame
});

/**
 * `impulse` is the unspent |shake| impulse (m/s), `stroke` the recent
 * shake impulse as a vector, `wait` the cooldown left (s).
 * @typedef {{
 *   wells: ReadonlyArray<Well>,
 *   impulse: number,
 *   stroke: Vec2,
 *   wait: number,
 * }} GalaxyState
 */

/**
 * `shake` in m/s², screen axes, as stepSlosh reports it; `aspect` the
 * hero's half-width, its half-height being 1.
 * @typedef {{
 *   state: GalaxyState,
 *   shake: Vec2,
 *   dt: number,
 *   tuning: GalaxyTuning,
 *   aspect: number,
 * }} GalaxyStepOptions
 */

/**
 * `pos` holds x, y, z per particle; the galaxy velocity is added into
 * the x, y pairs of `flow`.
 * @typedef {{
 *   state: GalaxyState,
 *   pos: Float32Array,
 *   flow: Float32Array,
 *   count: number,
 *   tuning: GalaxyTuning,
 * }} GalaxyFlowOptions
 */

const TWO_PI = 2 * Math.PI;
// A well is dropped once its circulation falls below this share of the
// circulation one quantum of impulse makes.
const NEGLIGIBLE = 0.1;

/** @returns {GalaxyState} */
export function makeGalaxy() {
	return { wells: [], impulse: 0, stroke: vec(0, 0), wait: 0 };
}

/**
 * Adds the galaxy's velocity at every particle into `flow`. With
 * `spiral` 0 it is a sum of point-vortex flows, so divergence-free.
 * @param {GalaxyFlowOptions} options
 */
export function addGalaxyFlow(options) {
	const { state, pos, flow, count, tuning } = options;
	const { spiral } = tuning;
	for (const { x, y, spin, core2 } of state.wells) {
		for (let i = 0; i < count; i += 1) {
			const dx = pos[i * 3] - x;
			const dy = pos[i * 3 + 1] - y;
			const rate = swirlRate(spin, core2, dx * dx + dy * dy);
			const inward = spiral * Math.abs(rate);
			flow[i * 2] += -rate * dy - inward * dx;
			flow[i * 2 + 1] += rate * dx - inward * dy;
		}
	}
}

/**
 * How stirred the galaxy is, 0 calm to 1 at `full` circulation.
 * @param {GalaxyState} state
 * @param {GalaxyTuning} tuning
 * @returns {number}
 */
export function galaxyAgitation(state, tuning) {
	const total = state.wells.reduce((sum, well) => sum + Math.abs(well.spin), 0);
	return Math.min(1, total / tuning.full);
}

/**
 * A new-born pair. ACROSS is the stroke turned a quarter anticlockwise;
 * the well at mid + across·s/2 spins clockwise and its partner
 * anticlockwise, so between them both carry the liquid along −stroke.
 * @param {Vec2} stroke
 * @param {number} spin
 * @param {GalaxyTuning} tuning
 * @param {Vec2} half
 * @returns {Well[]}
 */
function spawnPair(stroke, spin, tuning, half) {
	const along = scaled(stroke, 1 / Math.hypot(stroke.x, stroke.y));
	const across = scaled(vec(-along.y, along.x), tuning.spacing / 2);
	const reach = tuning.jitter * Math.sqrt(Math.random());
	const angle = TWO_PI * Math.random();
	const mid = vec(reach * Math.cos(angle), reach * Math.sin(angle));
	const core2 = tuning.core * tuning.core;
	/** @type {(at: Vec2, sign: number) => Well} */
	const well = (at, sign) => ({
		x: clamp(at.x, half.x),
		y: clamp(at.y, half.y),
		spin: sign * spin,
		core2,
		age: 0,
	});
	return [well(add(mid, across), -1), well(sub(mid, across), 1)];
}

/**
 * Adds the pair, first dropping the weakest wells to stay within MAX.
 * @param {ReadonlyArray<Well>} wells
 * @param {Well[]} pair
 * @param {number} max
 * @returns {Well[]}
 */
function admit(wells, pair, max) {
	const room = Math.max(0, max - pair.length);
	const strongest = [...wells]
		.sort((a, b) => Math.abs(b.spin) - Math.abs(a.spin))
		.slice(0, room);
	return [...strongest, ...pair].slice(0, max);
}

/**
 * Advances the galaxy by dt seconds and returns its new state: the wells
 * move and fade, and a stroke's impulse, once it reaches a quantum and
 * the cooldown has passed, sheds a new pair.
 * @param {GalaxyStepOptions} options
 * @returns {GalaxyState}
 */
export function stepGalaxy(options) {
	const { state, shake, dt, tuning, aspect } = options;
	if (!(dt > 0)) {
		return state;
	}
	const half = vec(aspect, 1);
	const floor = NEGLIGIBLE * tuning.strength * tuning.quantum;
	const wells = evolveWells({ wells: state.wells, dt, half, tuning }).filter(
		(well) => Math.abs(well.spin) > floor,
	);
	const memory = Math.exp(-dt / tuning.memory);
	const impulse =
		state.impulse * Math.exp(-dt / tuning.decay) +
		Math.hypot(shake.x, shake.y) * dt;
	const stroke = add(scaled(state.stroke, memory), scaled(shake, dt));
	const wait = Math.max(0, state.wait - dt);
	const ready = impulse >= tuning.quantum && wait === 0;
	if (!ready || Math.hypot(stroke.x, stroke.y) === 0) {
		return { wells, impulse, stroke, wait };
	}
	const pair = spawnPair(stroke, tuning.strength * impulse, tuning, half);
	const next = admit(wells, pair, tuning.maxWells);
	return { wells: next, impulse: 0, stroke, wait: tuning.cooldown };
}
