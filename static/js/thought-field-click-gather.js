// A press gathers nearby particles; release sends them back out. The field's
// ordinary drift restores their resting positions after this force ends.

/**
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: string, phase?: "hold" | "release" | "cancel", heldFor?: number,
 *   spin?: number }} GatherEvent
 */

/**
 * @typedef {{ x: number, y: number, event: GatherEvent, dt: number,
 *   aspect: number }} GatherOptions
 */

const ZERO = Object.freeze({ x: 0, y: 0 });
const RADIUS2 = 0.7 * 0.7;
const RELEASE_LIFE = 0.5;

/**
 * The short-tap floor makes release visible before a hold has built up.
 * @param {number} heldFor
 * @returns {number}
 */
function charge(heldFor) {
	return 0.18 + 0.82 * (1 - Math.exp(-Math.max(0, heldFor) / 0.55));
}

/**
 * Returns one frame of radial displacement for a particle at (x, y).
 * @param {GatherOptions} options
 * @returns {{ x: number, y: number }}
 */
export function effect(options) {
	const { x, y, event, dt, aspect } = options;
	if (
		event.mode !== "gather" ||
		event.phase === "cancel" ||
		![x, y, event.x, event.y, event.age, event.strength, dt, aspect].every(
			Number.isFinite,
		) ||
		(event.heldFor !== undefined && !Number.isFinite(event.heldFor)) ||
		dt <= 0 ||
		aspect <= 0 ||
		event.strength <= 0
	) {
		return ZERO;
	}

	const dx = x - event.x;
	const dy = y - event.y;
	const distance2 = dx * dx + dy * dy;
	if (distance2 <= 1e-8 || distance2 >= RADIUS2) {
		return ZERO;
	}

	const phase = event.phase ?? "hold";
	const age = Math.max(0, event.age);
	if (phase === "release" && age >= RELEASE_LIFE) {
		return ZERO;
	}
	const heldFor = event.heldFor ?? age;
	const fade =
		phase === "release" ? Math.exp(-age / 0.15) * (1 - age / RELEASE_LIFE) : 1;
	const direction = phase === "release" ? 1 : -1;
	const speed = phase === "release" ? 1.3 : 0.7;
	const falloff = (1 - distance2 / RADIUS2) ** 2;
	const distance = Math.sqrt(distance2);
	const step =
		direction *
		speed *
		charge(heldFor) *
		fade *
		falloff *
		Math.min(dt, 0.05) *
		Math.min(event.strength, 2);
	return { x: (dx / distance) * step, y: (dy / distance) * step };
}
