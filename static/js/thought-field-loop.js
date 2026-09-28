import {
	GLOBE_TUNING,
	makeGlobe,
	reseedGlobe,
	stepGlobe,
} from "./thought-field-globe.js";
import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";

/**
 * @typedef {import("./thought-field-globe.js").Globe} Globe
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
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
 * }} LoopOptions
 */

/**
 * Draws one frame and returns the snow globe advanced by DT. The globe
 * exists only with phone motion, so without it none of its physics runs.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {Globe | null} globe
 * @returns {Globe | null}
 */
function renderFrame(options, now, dt, globe) {
	const { renderer, field, pointer, meteors, dims, motion } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	const sample = motion?.reading() ?? null;
	const tuning = GLOBE_TUNING;
	// The only motion branch: without a globe, positions are the plain drift.
	const moved =
		globe === null
			? NO_GLOBE
			: stepGlobe({ globe, field, sample, dt, aspect, tuning });
	const hold = moved.hold;
	stepParticles({ field, aspect, time, dt, pointer, meteors, hold });
	renderer.render();
	return moved.globe;
}

/**
 * A pause keeps the globe's velocities and vortices; dt is capped, so
 * resuming never jumps.
 * @param {LoopOptions} options
 * @returns {{ start: () => void, stop: () => void, destroy: () => void }}
 */
export function createLoop(options) {
	let frame = 0;
	let running = false;
	let last = performance.now();
	let globe = options.motion === null ? null : makeGlobe(options.field.count);
	/** @param {number} now */
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		globe = renderFrame(options, now, dt, globe);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		globe = globe === null ? null : reseedGlobe(globe);
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
