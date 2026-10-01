/**
 * @typedef {{ x: number, y: number, age: number, strength: number, mode: string,
 *   phase?: number, heldFor?: number, spin?: number }} GravityEvent
 * @typedef {{ x: number, y: number, event: GravityEvent, dt: number, aspect: number }} GravityOptions
 */

const IMPLOSION = { lifetime: 0.65, radius: 0.55, rate: 4.5 };
const SLOW = { lifetime: 2.4, radius: 0.85, rate: 1.1 };

/**
 * Pull a particle toward a click. The Gaussian core makes the force zero at
 * the exact centre, while the age envelope ends each pull without a jump.
 * @param {GravityOptions} options
 * @returns {{ x: number, y: number }}
 */
export function effect(options) {
	const { x, y, event, dt, aspect } = options;
	const tuning =
		event.mode === "gravity-implosion"
			? IMPLOSION
			: event.mode === "gravity-slow"
				? SLOW
				: null;
	if (
		tuning === null ||
		![x, y, event.x, event.y, event.age, event.strength, dt, aspect].every(
			Number.isFinite,
		) ||
		aspect <= 0 ||
		dt <= 0 ||
		event.age < 0 ||
		event.age >= tuning.lifetime
	) {
		return { x: 0, y: 0 };
	}
	const dx = event.x - x;
	const dy = event.y - y;
	const radius2 = tuning.radius * tuning.radius;
	const distance2 = dx * dx + dy * dy;
	if (!Number.isFinite(distance2)) {
		return { x: 0, y: 0 };
	}
	const fade = 1 - event.age / tuning.lifetime;
	const strength = Math.min(1, Math.max(0, event.strength));
	const step = tuning.rate * Math.min(dt, 1 / 30) * fade * fade * strength;
	const falloff = Math.exp(-distance2 / (2 * radius2));
	return { x: dx * step * falloff, y: dy * step * falloff };
}
