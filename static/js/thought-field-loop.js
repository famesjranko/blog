import { makeEngine, stepEngine } from "./thought-field-engine.js";
import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";
import { reseedSlosh, restingSlosh, stepSlosh } from "./thought-field-slosh.js";

/**
 * @typedef {import("./thought-field-slosh.js").SloshState} SloshState
 * @typedef {import("./thought-field-engine.js").Engine} Engine
 * @typedef {import("./thought-field-engine.js").Settings} Settings
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
 * @typedef {import("./thought-field-perf.js").PerfMeter} PerfMeter
 */

/**
 * The motion filters and, only where there is phone motion, the engine.
 * @typedef {{ slosh: SloshState, engine: Engine | null }} PhysicsState
 */

/** @type {{ engine: null, hold: number }} */
const NO_ENGINE = Object.freeze({ engine: null, hold: 1 });

/**
 * `settings` is read every frame, so a change takes effect on the next.
 * @typedef {{
 *   renderer: { render: () => void },
 *   field: import("./thought-field-particles.js").Field,
 *   pointer: import("./thought-field-particles.js").Pointer,
 *   hero: Element | null,
 *   meteors: import("./thought-field-meteors.js").Meteors,
 *   dims: { aspect: number },
 *   motion: MotionInput | null,
 *   perf: PerfMeter | null,
 *   settings: () => Settings,
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
	const settings = options.settings();
	const aspect = dims.aspect;
	const time = now / 1000;
	const sample = motion?.reading() ?? null;
	const tuning = settings.slosh;
	const filtered = stepSlosh({ state: state.slosh, sample, dt, tuning });
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	const { engine } = state;
	// The only motion branch: without an engine, positions are the plain drift.
	const moved =
		engine === null
			? NO_ENGINE
			: stepEngine({ engine, settings, field, filtered, dt, time, aspect });
	const hold = moved.hold;
	stepParticles({ field, aspect, time, dt, pointer, meteors, hold });
	return { slosh: filtered.state, engine: moved.engine };
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
 * The engine exists only with phone motion, so without it none of its
 * physics runs. A pause keeps its velocities and agitation; dt is
 * capped, so resuming never jumps.
 * @param {LoopOptions} options
 * @returns {PhysicsState}
 */
function restingPhysics(options) {
	const { motion, field } = options;
	const kind = options.settings().engine;
	const engine = motion === null ? null : makeEngine(kind, field.count);
	return { slosh: restingSlosh(), engine };
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
