/**
 * @typedef {import("./thought-field-hold-state.js").HoldEvent} HoldEvent
 * @typedef {{ x: number, y: number, event: HoldEvent, dt: number, aspect: number }} HoldOptions
 */

const RADIUS = 0.65;
const TAIL = 0.25;
const MAX_STEP = 0.03;
const ZERO = { x: 0, y: 0 };

/** @param {HoldOptions} options @returns {boolean} */
function valid(options) {
	const { x, y, event, dt, aspect } = options;
	return (
		[
			x,
			y,
			event.x,
			event.y,
			event.age,
			event.strength,
			event.heldFor,
			dt,
			aspect,
		].every(Number.isFinite) &&
		aspect > 0 &&
		dt > 0 &&
		event.age >= 0 &&
		event.heldFor >= 0 &&
		event.strength > 0 &&
		(event.phase === "hold" || event.phase === "release") &&
		(event.phase !== "release" || event.age < TAIL)
	);
}

/** @param {HoldOptions} options @returns {{ x: number, y: number }} */
export function effect(options) {
	if (!valid(options)) {
		return ZERO;
	}
	const { x, y, event, dt } = options;
	const dx = x - event.x;
	const dy = y - event.y;
	const distance = Math.hypot(dx, dy);
	if (!Number.isFinite(distance) || distance === 0 || distance >= RADIUS) {
		return ZERO;
	}
	const ramp = 0.1 + 0.9 * Math.min(event.heldFor / 0.5, 1);
	const fade = event.phase === "hold" ? 1 : 1 - event.age / TAIL;
	const rebound = event.mode === "hold-pull" && event.phase === "release";
	const speed = rebound ? 0.6 : 2.4;
	const falloff = (1 - distance / RADIUS) ** 2;
	const step = Math.min(
		MAX_STEP,
		speed *
			Math.min(dt, 1 / 30) *
			ramp *
			fade *
			falloff *
			Math.min(event.strength, 2),
	);
	const radial = event.mode === "hold-pull" && !rebound ? -1 : 1;
	if (event.mode === "hold-orbit") {
		return { x: (dy / distance) * step, y: (-dx / distance) * step };
	}
	return {
		x: (dx / distance) * step * radial,
		y: (dy / distance) * step * radial,
	};
}
