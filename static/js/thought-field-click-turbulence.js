/**
 * @typedef {{
 *   x: number, y: number, age: number, strength: number, mode: string,
 *   phase?: number, heldFor?: number, spin?: number,
 * }} ClickEvent
 */

/**
 * @typedef {{
 *   x: number, y: number, event: ClickEvent, dt: number, aspect: number,
 * }} EffectOptions
 */

const LIFE = 1.4;
const RADIUS = 0.55;
const ZERO = Object.freeze({ x: 0, y: 0 });

/**
 * A short, local eddy in the existing particle positions. The spatial
 * envelope and age fade both reach zero, leaving the field's usual drift.
 * @param {EffectOptions} options
 * @returns {{ x: number, y: number }}
 */
export function effect(options) {
	const { x, y, event, dt, aspect } = options;
	const { phase = 0, spin = 1 } = event;
	if (
		event.mode !== "turbulence" ||
		![
			x,
			y,
			event.x,
			event.y,
			event.age,
			event.strength,
			dt,
			aspect,
			phase,
			spin,
		].every(Number.isFinite) ||
		event.age < 0 ||
		event.age >= LIFE ||
		event.strength <= 0 ||
		dt <= 0 ||
		aspect <= 0
	) {
		return ZERO;
	}

	const dx = x - event.x;
	const dy = y - event.y;
	const r2 = dx * dx + dy * dy;
	if (r2 >= RADIUS * RADIUS) {
		return ZERO;
	}

	const reach = 1 - r2 / (RADIUS * RADIUS);
	const remaining = 1 - event.age / LIFE;
	const amplitude = Math.min(event.strength, 2) * Math.min(dt, 0.05);
	const weight = reach * reach * remaining * remaining * amplitude;
	const wave = phase + event.age * 13;
	const swirl = Math.max(-2, Math.min(2, spin));
	return {
		x: weight * (-2 * dy * swirl + 0.16 * Math.sin(wave + 17 * dx - 11 * dy)),
		y: weight * (2 * dx * swirl + 0.16 * Math.cos(wave - 9 * dx + 15 * dy)),
	};
}
