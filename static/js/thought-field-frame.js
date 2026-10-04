// One frame of the hero field and the state carried between frames:
// pointer, meteors, the snow globe where there is phone motion, the drift,
// and the birth, then the draw. thought-field-loop.js decides when frames
// run.
import { BIRTH_TUNING, makeSeeds, stepBirth } from "./thought-field-birth.js";
import { isHoldEvent } from "./thought-field-hold-state.js";
import { stepMeteors } from "./thought-field-meteors.js";
import { pointerStrength, stepParticles } from "./thought-field-particles.js";

/**
 * @typedef {typeof import("./thought-field-globe.js")} GlobeModule
 * @typedef {import("./thought-field-globe.js").Globe} Globe
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
 */

/**
 * The snow globe and the module that steps it.
 * @typedef {{ module: GlobeModule, globe: Globe }} Physics
 */

/** @type {{ physics: null, hold: number }} */
const NO_PHYSICS = Object.freeze({ physics: null, hold: 1 });

/**
 * @typedef {{
 *   renderer: { render: () => void },
 *   field: import("./thought-field-particles.js").Field,
 *   pointer: import("./thought-field-particles.js").Pointer,
 *   hero: Element | null,
 *   meteors: import("./thought-field-meteors.js").Meteors,
 *   dims: { aspect: number },
 *   motion: MotionInput | null,
 *   clicks?: (dt: number) => import("./thought-field-particles.js").ClickEvent[],
 * }} LoopOptions
 */

/**
 * Seconds since the field's birth began, whether any particle is still
 * being born, and the birth's per-particle seeds.
 * @typedef {{ age: number, growing: boolean, seeds: Float32Array }} Growth
 */

/**
 * Moves the field one frame and returns the snow globe advanced by DT.
 * Without phone motion there is no globe, so none of its physics runs.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {Physics | null} physics
 * @returns {Physics | null}
 */
function stepFrame(options, now, dt, physics) {
	const { field, pointer, meteors, dims } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	const moved =
		physics === null ? NO_PHYSICS : stepPhysics(options, dt, physics);
	const hold = moved.hold;
	const events = options.clicks?.(dt) ?? [];
	const forcePointer = events.some(isHoldEvent)
		? { ...pointer, strength: 0 }
		: pointer;
	stepParticles({
		field,
		aspect,
		time,
		dt,
		pointer: forcePointer,
		meteors,
		hold,
		events,
	});
	return moved.physics;
}

/**
 * Advances the birth by DT, over the positions the drift has just set.
 * A paused loop does not age it, so the birth waits for the hero.
 * @param {LoopOptions} options
 * @param {Growth} growth
 * @param {number} now
 * @param {number} dt
 * @returns {Growth}
 */
function grow(options, growth, now, dt) {
	if (!growth.growing) {
		return growth;
	}
	const age = growth.age + dt;
	const growing = stepBirth({
		field: options.field,
		seeds: growth.seeds,
		age,
		aspect: options.dims.aspect,
		time: now / 1000,
		tuning: BIRTH_TUNING,
	});
	return { age, growing, seeds: growth.seeds };
}

/**
 * What the loop carries from frame to frame.
 * @typedef {{ physics: Physics | null, growth: Growth }} FrameState
 */

/**
 * Moves the field one frame from STATE, draws it, and returns the next
 * state.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {FrameState} state
 * @returns {FrameState}
 */
export function renderFrame(options, now, dt, state) {
	const physics = stepFrame(options, now, dt, state.physics);
	const growth = grow(options, state.growth, now, dt);
	options.renderer.render();
	return { physics, growth };
}

/**
 * Steps the snow globe by DT with the latest phone reading.
 * @param {LoopOptions} options
 * @param {number} dt
 * @param {Physics} physics
 * @returns {{ physics: Physics, hold: number }}
 */
function stepPhysics(options, dt, physics) {
	const { field, dims, motion } = options;
	const { module } = physics;
	const moved = module.stepGlobe({
		globe: physics.globe,
		field,
		sample: motion?.reading() ?? null,
		dt,
		aspect: dims.aspect,
		tuning: module.GLOBE_TUNING,
	});
	return { physics: { module, globe: moved.globe }, hold: moved.hold };
}

/**
 * Keeps the globe's motion but has the next reading re-seed its filter,
 * so resuming at a new hold angle causes no kick.
 * @param {Physics} physics
 * @returns {Physics}
 */
export function reseed({ module, globe }) {
	return { module, globe: module.reseedGlobe(globe) };
}

/**
 * Fetches the snow globe only where there is phone motion, so no other
 * device downloads its physics. Until it arrives, or if the fetch
 * fails, the field keeps its plain drift: the globe is decoration.
 * @param {number} count
 * @param {(physics: Physics) => void} onLoad
 */
async function loadPhysics(count, onLoad) {
	try {
		const url = new URL("./thought-field-globe.js", import.meta.url);
		/** @type {GlobeModule} */
		const module = await import(url.href);
		onLoad({ module, globe: module.makeGlobe(count) });
	} catch {
		// No globe: the drift carries on unchanged.
	}
}

/**
 * Holds the frame state. The snow globe joins it once it has loaded; it
 * stays empty without phone motion.
 * @param {LoopOptions} options
 * @returns {FrameState}
 */
export function frameSlot(options) {
	/** @type {FrameState} */
	const slot = {
		physics: null,
		growth: { age: 0, growing: true, seeds: makeSeeds(options.field.count) },
	};
	if (options.motion !== null) {
		void loadPhysics(options.field.count, (loaded) => {
			slot.physics = loaded;
		});
	}
	return slot;
}
