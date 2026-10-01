// A brief outward push around a click. The particle loop applies this
// displacement after drift; once it ends, drift brings particles home.

const RADIUS = 0.45;
const DURATION = 0.16;
const SPEED = 3;

/**
 * @typedef {{ x: number, y: number, age: number, strength: number, mode: string, phase?: number, heldFor?: number, spin?: number }} ClickEvent
 */

/**
 * @param {{ x: number, y: number, event: ClickEvent, dt: number, aspect: number }} options
 * @returns {{ x: number, y: number }}
 */
export function effect(options) {
	const { x, y, event, dt, aspect } = options;
	if (
		event.mode !== "scatter" ||
		!Number.isFinite(x) ||
		!Number.isFinite(y) ||
		!Number.isFinite(event.x) ||
		!Number.isFinite(event.y) ||
		!Number.isFinite(event.age) ||
		!Number.isFinite(event.strength) ||
		!Number.isFinite(dt) ||
		!Number.isFinite(aspect) ||
		dt <= 0 ||
		aspect <= 0 ||
		event.age < 0 ||
		event.age >= DURATION ||
		event.strength <= 0
	) {
		return { x: 0, y: 0 };
	}
	const dx = x - event.x;
	const dy = y - event.y;
	const distance = Math.hypot(dx, dy);
	if (distance === 0 || distance >= RADIUS) {
		return { x: 0, y: 0 };
	}
	const falloff = (1 - distance / RADIUS) ** 2;
	const remaining = Math.min(dt, DURATION - event.age);
	const fade = 1 - event.age / DURATION;
	const distanceMoved =
		SPEED * Math.min(event.strength, 3) * remaining * fade * falloff;
	return {
		x: (dx / distance) * distanceMoved,
		y: (dy / distance) * distanceMoved,
	};
}
