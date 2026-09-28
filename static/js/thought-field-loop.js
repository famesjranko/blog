import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";

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
 * }} LoopOptions
 */

/**
 * Draws one frame and returns the snow globe advanced by DT. Without
 * phone motion there is no globe, so none of its physics runs.
 * @param {LoopOptions} options
 * @param {number} now
 * @param {number} dt
 * @param {Physics | null} physics
 * @returns {Physics | null}
 */
function renderFrame(options, now, dt, physics) {
	const { renderer, field, pointer, meteors, dims } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	const moved =
		physics === null ? NO_PHYSICS : stepPhysics(options, dt, physics);
	const hold = moved.hold;
	stepParticles({ field, aspect, time, dt, pointer, meteors, hold });
	renderer.render();
	return moved.physics;
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
function reseed({ module, globe }) {
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
 * Holds the snow globe once it has loaded; it stays empty without phone
 * motion.
 * @param {LoopOptions} options
 * @returns {{ physics: Physics | null }}
 */
function physicsSlot(options) {
	/** @type {{ physics: Physics | null }} */
	const slot = { physics: null };
	if (options.motion !== null) {
		void loadPhysics(options.field.count, (loaded) => {
			slot.physics = loaded;
		});
	}
	return slot;
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
	const slot = physicsSlot(options);
	/** @param {number} now */
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		slot.physics = renderFrame(options, now, dt, slot.physics);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		slot.physics = slot.physics === null ? null : reseed(slot.physics);
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
