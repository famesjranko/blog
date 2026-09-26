// Procedural swirl for the snow-globe hero: a fixed lattice of drifting
// curl-noise eddies whose speed follows the globe's agitation. Pure
// maths, no DOM or sensor APIs, so Node can test it directly.

/**
 * @typedef {{
 *   swirlSpeed: number,
 *   eddySize: number,
 *   eddyDrift: number,
 * }} PatternTuning
 */

/** @type {Readonly<PatternTuning>} */
export const PATTERN_TUNING = Object.freeze({
	swirlSpeed: 0.7, // field units/s; RMS flow speed at full agitation
	eddySize: 0.6, // field units; rough diameter of one swirl
	eddyDrift: 0.4, // rad/s; how fast the swirl pattern wanders
});

/**
 * `waves` is the caller's table from makeWaves; `pos` holds x, y, z
 * triples and `flow` receives x, y pairs. `sweep` is the agitation
 * (0..1) and the time in seconds.
 * @typedef {{
 *   waves: Float32Array,
 *   pos: Float32Array,
 *   flow: Float32Array,
 *   count: number,
 *   sweep: { energy: number, time: number },
 *   tuning: PatternTuning,
 * }} PatternFlowOptions
 */

// Three wave vectors 60° apart cross into a lattice of counter-rotating
// eddies; the finer fourth wave breaks up its regularity. SIZE scales
// eddySize; DRIFT scales eddyDrift.
const WAVES = Object.freeze([
	{ angle: 0.3, size: 1, amp: 1, drift: 1, phase: 0 },
	{ angle: 1.35, size: 0.9, amp: 1, drift: -0.8, phase: 2.1 },
	{ angle: 2.4, size: 1.15, amp: 1, drift: 0.6, phase: 4.2 },
	{ angle: 0.85, size: 0.6, amp: 0.5, drift: -1.3, phase: 1.3 },
]);
const WAVE_STRIDE = 5;
// Normalises the summed waves to unit RMS speed (each cosine has mean square 1/2).
const RMS_NORM =
	1 / Math.sqrt(WAVES.reduce((sum, wave) => sum + wave.amp * wave.amp, 0) / 2);

/** @returns {Float32Array} */
export function makeWaves() {
	return new Float32Array(WAVES.length * WAVE_STRIDE);
}

/**
 * Writes this frame's wave table: per wave, the wave vector (kx, ky),
 * the phase and the velocity it adds per unit cosine (ax, ay).
 * @param {PatternFlowOptions} options
 */
function fillWaves(options) {
	const { waves, sweep, tuning } = options;
	const speed = sweep.energy * tuning.swirlSpeed * RMS_NORM;
	for (let k = 0; k < WAVES.length; k += 1) {
		const { angle, size, amp, drift, phase } = WAVES[k];
		const wavenumber = Math.PI / (tuning.eddySize * size);
		const o = k * WAVE_STRIDE;
		waves[o] = wavenumber * Math.cos(angle);
		waves[o + 1] = wavenumber * Math.sin(angle);
		waves[o + 2] = phase + drift * tuning.eddyDrift * sweep.time;
		// u = curl of psi = (dpsi/dy, -dpsi/dx) for psi = (A / k) sin(k.x + phase).
		waves[o + 3] = speed * amp * Math.sin(angle);
		waves[o + 4] = -speed * amp * Math.cos(angle);
	}
}

/**
 * Samples the eddies' velocity at every particle into `flow`,
 * overwriting it. It is the curl of a stream function, so
 * divergence-free.
 * @param {PatternFlowOptions} options
 */
export function sampleFlow(options) {
	fillWaves(options);
	const { waves, pos, flow, count } = options;
	for (let i = 0; i < count; i += 1) {
		const x = pos[i * 3];
		const y = pos[i * 3 + 1];
		let ux = 0;
		let uy = 0;
		for (let o = 0; o < waves.length; o += WAVE_STRIDE) {
			const c = Math.cos(waves[o] * x + waves[o + 1] * y + waves[o + 2]);
			ux += waves[o + 3] * c;
			uy += waves[o + 4] * c;
		}
		flow[i * 2] = ux;
		flow[i * 2 + 1] = uy;
	}
}
