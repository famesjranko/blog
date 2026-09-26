import { GLOBE_TUNING, makeGlobe, stepGlobe } from "./thought-field-globe.js";
import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";
import {
	SLOSH_TUNING,
	reseedSlosh,
	restingSlosh,
	stepSlosh,
} from "./thought-field-slosh.js";

/**
 * @typedef {import("./thought-field-slosh.js").SloshState} SloshState
 * @typedef {import("./thought-field-globe.js").Globe} Globe
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
 * @typedef {import("./thought-field-perf.js").PerfMeter} PerfMeter
 */

/**
 * The motion filters and, only where there is phone motion, the globe.
 * @typedef {{ slosh: SloshState, globe: Globe | null }} PhysicsState
 */

/** @type {{ globe: null, hold: number }} */
const NO_GLOBE = Object.freeze({ globe: null, hold: 1 });

/**
 * @typedef {{
 *   renderer: { render: () => void },
 *   field: import("./thought-field-particles.js").Field,
 *   pointer: import("./thought-field-particles.js").Pointer,
 *   hero: Element | null,
 *   meteors: import("./thought-field-meteors.js").Meteors,
 *   dims: { aspect: number },
 *   motion: MotionInput | null,
 *   perf: PerfMeter | null,
 * }} LoopOptions
 */

/**
 * Advances every per-frame simulation by DT and returns the new physics
 * state. Everything in here is timed as the frame's physics cost.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {PhysicsState} state
 * @returns {PhysicsState}
 */
function stepPhysics(options, now, dt, state) {
	const { field, pointer, meteors, dims, motion } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	const sample = motion?.reading() ?? null;
	const tuning = SLOSH_TUNING;
	const step = stepSlosh({ state: state.slosh, sample, dt, tuning });
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	const input = { shake: step.shake, lean: step.lean, spin: sample?.spin ?? 0 };
	const { globe } = state;
	// The only motion branch: without a globe, positions are the plain drift.
	const moved =
		globe === null
			? NO_GLOBE
			: stepGlobe({ globe, field, input, dt, time, tuning: GLOBE_TUNING });
	const hold = moved.hold;
	stepParticles({ field, aspect, time, dt, pointer, meteors, hold });
	return { slosh: step.state, globe: moved.globe };
}

/**
 * Steps the physics, draws one frame and returns the new physics state.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {PhysicsState} state
 * @returns {PhysicsState}
 */
function renderFrame(options, now, dt, state) {
	const { renderer, perf } = options;
	perf?.frame(now);
	perf?.begin();
	const next = stepPhysics(options, now, dt, state);
	perf?.end();
	renderer.render();
	return next;
}

/**
 * The globe exists only with phone motion, so without it none of its
 * physics runs. A pause keeps its velocities and agitation; dt is
 * capped, so resuming never jumps.
 * @param {LoopOptions} options
 * @returns {PhysicsState}
 */
function restingPhysics(options) {
	const { motion, field } = options;
	const globe = motion === null ? null : makeGlobe(field.count);
	return { slosh: restingSlosh(), globe };
}

/**
 * @param {LoopOptions} options
 * @returns {{ start: () => void, stop: () => void, destroy: () => void }}
 */
export function createLoop(options) {
	let frame = 0;
	let running = false;
	let last = performance.now();
	let physics = restingPhysics(options);
	/** @param {number} now */
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		physics = renderFrame(options, now, dt, physics);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		physics = { ...physics, slosh: reseedSlosh(physics.slosh) };
		options.motion?.resume();
		frame = window.requestAnimationFrame(tick);
	};
	const stop = () => {
		running = false;
		options.motion?.pause();
		if (frame !== 0) {
			window.cancelAnimationFrame(frame);
			frame = 0;
		}
	};
	const onChange = () => {
		if (visible() && !running) {
			start();
		} else if (!visible() && running) {
			stop();
		}
	};
	const seen = observeHero(options.hero, onChange, stop);
	const destroy = () => {
		stop();
		seen?.disconnect();
		document.removeEventListener("visibilitychange", onChange);
	};
	document.addEventListener("visibilitychange", onChange);
	return { start, stop, destroy };
}

/**
 * @param {Element | null} hero
 * @param {() => void} onChange
 * @param {() => void} stop
 * @returns {IntersectionObserver | null}
 */
function observeHero(hero, onChange, stop) {
	if (!("IntersectionObserver" in window) || hero === null) {
		return null;
	}
	const seen = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			onChange();
		} else {
			stop();
		}
	});
	seen.observe(hero);
	return seen;
}

/**
 * @param {Element | null} hero
 * @returns {boolean}
 */
function heroVisible(hero) {
	if (hero === null || !("IntersectionObserver" in window)) {
		return true;
	}
	const rect = hero.getBoundingClientRect();
	return rect.bottom > 0 && rect.top < window.innerHeight;
}
