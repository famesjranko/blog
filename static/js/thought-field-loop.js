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
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
 * @typedef {import("./thought-field-perf.js").PerfMeter} PerfMeter
 */

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
 * Advances every per-frame simulation by DT and returns the new slosh
 * state. Everything in here is timed as the frame's physics cost.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {SloshState} state
 * @returns {SloshState}
 */
function stepPhysics(options, now, dt, state) {
	const { field, pointer, meteors, dims, motion } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	const sample = motion?.reading() ?? null;
	const step = stepSlosh({ state, sample, dt, tuning: SLOSH_TUNING });
	const { shift, delta } = step;
	const slosh = { shift, delta, spread: SLOSH_TUNING.spread };
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	stepParticles({ field, aspect, time, dt, pointer, meteors, slosh });
	return step.state;
}

/**
 * Steps the physics, draws one frame and returns the new slosh state.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {SloshState} state
 * @returns {SloshState}
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
 * @param {LoopOptions} options
 * @returns {{ start: () => void, stop: () => void, destroy: () => void }}
 */
export function createLoop(options) {
	let frame = 0;
	let running = false;
	let last = performance.now();
	let slosh = restingSlosh();
	/** @param {number} now */
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		slosh = renderFrame(options, now, dt, slosh);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		slosh = reseedSlosh(slosh);
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
