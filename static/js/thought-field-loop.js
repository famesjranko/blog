import { createGlobe } from "./thought-field-globe.js";
import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";

/**
 * @typedef {import("./thought-field-globe.js").Globe} Globe
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
 * Advances every per-frame simulation by DT. Everything in here is
 * timed as the frame's physics cost.
 * @param {LoopOptions} options
 * @param {Globe | null} globe
 * @param {number} now
 * @param {number} dt
 */
function stepPhysics(options, globe, now, dt) {
	const { field, pointer, meteors, dims } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	// Without motion no globe exists, so the drift runs exactly as it always has.
	const calm = globe === null ? 1 : globe.step(aspect, dt);
	stepParticles({ field, aspect, time, dt, pointer, meteors, calm });
}

/**
 * Steps the physics and draws one frame.
 * @param {LoopOptions} options
 * @param {Globe | null} globe
 * @param {number} now
 * @param {number} dt
 */
function renderFrame(options, globe, now, dt) {
	const { renderer, perf } = options;
	perf?.frame(now);
	perf?.begin();
	stepPhysics(options, globe, now, dt);
	perf?.end();
	renderer.render();
}

/**
 * @param {LoopOptions} options
 * @returns {{ start: () => void, stop: () => void, destroy: () => void }}
 */
export function createLoop(options) {
	let frame = 0;
	let running = false;
	let last = performance.now();
	const { motion } = options;
	const globe = motion === null ? null : createGlobe(options.field, motion);
	/** @param {number} now */
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		renderFrame(options, globe, now, dt);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		globe?.reseed();
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
