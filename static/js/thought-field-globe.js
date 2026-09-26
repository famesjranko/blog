// Snow-globe response to phone motion for the hero field. A shake or a
// twist stirs the liquid into drifting eddies; each particle is dragged
// by its local flow and jolted and sunk by its own weight. Pure maths,
// no DOM or sensor APIs, so Node can test it directly.

/**
 * @typedef {import("./thought-field-slosh.js").Vec2} Vec2
 * @typedef {import("./thought-field-particles.js").Field} Field
 */

/**
 * @typedef {{
 *   shakeStir: number,
 *   twistStir: number,
 *   twistDeadzone: number,
 *   viscosity: number,
 *   swirlSpeed: number,
 *   eddySize: number,
 *   eddyDrift: number,
 *   fluidLag: number,
 *   shakeGain: number,
 *   drag: number,
 *   heavyLag: number,
 *   tiltGain: number,
 *   free: number,
 * }} GlobeTuning
 */

/** @type {Readonly<GlobeTuning>} */
export const GLOBE_TUNING = Object.freeze({
	shakeStir: 0.28, // agitation per m/s of shake (m/s² summed over seconds)
	twistStir: 0.4, // agitation per radian the liquid lags a twist
	twistDeadzone: 0.2, // rad/s of liquid-vs-phone spin ignored: hand wobble
	viscosity: 0.6, // s; time constant for the swirling to die away
	swirlSpeed: 0.7, // field units/s; RMS flow speed at full agitation
	eddySize: 0.6, // field units; rough diameter of one swirl
	eddyDrift: 0.4, // rad/s; how fast the swirl pattern wanders
	fluidLag: 0.4, // s; how long the liquid takes to catch up with a twist
	shakeGain: 0.7, // field units/s² of jolt per m/s² of shake, heaviest flake
	drag: 0.2, // s; how quickly the lightest flake takes up the local flow
	heavyLag: 2, // the heaviest flake's extra drag time, in multiples of drag
	tiltGain: 5, // field units/s² of sinking per field unit of lean, heaviest
	free: 2.5, // how far agitation loosens the pull home; 0 never loosens it
});

/**
 * Per-particle velocity and local flow as x, y pairs; the agitation
 * (0..1); the liquid's lagged spin (rad/s); and this frame's wave table.
 * @typedef {{
 *   energy: number,
 *   spinFluid: number,
 *   vel: Float32Array,
 *   flow: Float32Array,
 *   waves: Float32Array,
 * }} Globe
 */

/**
 * `shake` (m/s²), `lean` (field units) and `spin` (the phone's twist
 * rate, rad/s, counter-clockwise positive) as stepSlosh reports them.
 * @typedef {{ shake: Vec2, lean: Vec2, spin: number }} GlobeInput
 */

/**
 * @typedef {{
 *   globe: Globe,
 *   field: Field,
 *   input: GlobeInput,
 *   dt: number,
 *   time: number,
 *   tuning: GlobeTuning,
 * }} GlobeStepOptions
 */

/**
 * `twist` is the liquid's spin relative to the phone (rad/s).
 * @typedef {{
 *   globe: Globe,
 *   field: Field,
 *   flow: { energy: number, time: number, twist: number },
 *   tuning: GlobeTuning,
 * }} FlowOptions
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
		spinFluid: 0,
		vel: new Float32Array(count * 2),
		flow: new Float32Array(count * 2),
		waves: new Float32Array(WAVES.length * WAVE_STRIDE),
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
 * Pumps the agitation from shake and twist and lets viscosity drain it;
 * the liquid's spin follows the phone's with a first-order lag.
 * @param {Globe} globe
 * @param {GlobeInput} input
 * @param {number} dt
 * @param {GlobeTuning} tuning
 * @returns {{ energy: number, spinFluid: number }}
 */
function stir(globe, input, dt, tuning) {
	const follow = 1 - Math.exp(-dt / tuning.fluidLag);
	const spinFluid = globe.spinFluid + (input.spin - globe.spinFluid) * follow;
	const twist = Math.abs(spinFluid - input.spin) - tuning.twistDeadzone;
	const pump =
		tuning.shakeStir * Math.hypot(input.shake.x, input.shake.y) +
		tuning.twistStir * Math.max(0, twist);
	const drained = globe.energy * Math.exp(-dt / tuning.viscosity);
	return { energy: Math.min(1, drained + pump * dt), spinFluid };
}

/**
 * Writes this frame's wave table: per wave, the wave vector (kx, ky),
 * the phase and the velocity it adds per unit cosine (ax, ay).
 * @param {FlowOptions} options
 */
function fillWaves(options) {
	const { globe, flow, tuning } = options;
	const { waves } = globe;
	const speed = flow.energy * tuning.swirlSpeed * RMS_NORM;
	for (let k = 0; k < WAVES.length; k += 1) {
		const { angle, size, amp, drift, phase } = WAVES[k];
		const wavenumber = Math.PI / (tuning.eddySize * size);
		const o = k * WAVE_STRIDE;
		waves[o] = wavenumber * Math.cos(angle);
		waves[o + 1] = wavenumber * Math.sin(angle);
		waves[o + 2] = phase + drift * tuning.eddyDrift * flow.time;
		// u = curl of psi = (dpsi/dy, -dpsi/dx) for psi = (A / k) sin(k.x + phase).
		waves[o + 3] = speed * amp * Math.sin(angle);
		waves[o + 4] = -speed * amp * Math.cos(angle);
	}
}

/**
 * Samples the liquid's velocity at every particle into `globe.flow`: the
 * stirred eddies plus the rigid rotation of a liquid lagging a twist.
 * Both are curls of a stream function, so the flow is divergence-free.
 * @param {FlowOptions} options
 */
export function sampleFlow(options) {
	fillWaves(options);
	const { globe, field } = options;
	const { twist } = options.flow;
	const { waves, flow } = globe;
	const { pos, count } = field;
	for (let i = 0; i < count; i += 1) {
		const x = pos[i * 3];
		const y = pos[i * 3 + 1];
		let ux = -twist * y;
		let uy = twist * x;
		for (let o = 0; o < waves.length; o += WAVE_STRIDE) {
			const c = Math.cos(waves[o] * x + waves[o + 1] * y + waves[o + 2]);
			ux += waves[o + 3] * c;
			uy += waves[o + 4] * c;
		}
		flow[i * 2] = ux;
		flow[i * 2 + 1] = uy;
	}
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
	const { globe, field, input, dt, time, tuning } = options;
	if (!(dt > 0)) {
		return { globe, hold: homeHold(globe.energy, tuning) };
	}
	const stirred = stir(globe, input, dt, tuning);
	const twist = stirred.spinFluid - input.spin;
	const flow = { energy: stirred.energy, time, twist };
	sampleFlow({ globe, field, flow, tuning });
	pushParticles(options);
	const next = { ...globe, ...stirred };
	return { globe: next, hold: homeHold(next.energy, tuning) };
}
