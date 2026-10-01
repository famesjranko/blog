// A passing ring of force. The field draws only its existing particles.

/**
 * @typedef {{ x: number, y: number, age: number, strength: number, mode: string, phase?: number, heldFor?: number, spin?: number }} ClickEvent
 * @typedef {{ x: number, y: number, event: ClickEvent, dt: number, aspect: number }} EffectOptions
 */

const SPEED = 1.7;
const WIDTH = 0.18;
const LIFETIME = 2.6;
const PUSH = 0.035;

/**
 * Returns one frame's outward displacement when the ring reaches a particle.
 * The caller adds this to the particle position after its ordinary drift step.
 * @param {EffectOptions} options
 * @returns {{ x: number, y: number }}
 */
export function effect({ x, y, event, dt }) {
	const still = { x: 0, y: 0 };
	if (
		!Number.isFinite(event.age) ||
		!Number.isFinite(event.strength) ||
		!Number.isFinite(dt) ||
		event.age < 0 ||
		event.age >= LIFETIME ||
		dt <= 0
	) {
		return still;
	}
	const dx = x - event.x;
	const dy = y - event.y;
	const radius = Math.hypot(dx, dy);
	const gap = Math.abs(radius - event.age * SPEED);
	if (!Number.isFinite(radius) || radius === 0 || gap >= WIDTH) {
		return still;
	}
	const pulse = (1 - gap / WIDTH) ** 2;
	const fade = (1 - event.age / LIFETIME) ** 2;
	const distance = PUSH * pulse * fade * event.strength * Math.min(dt * 60, 3);
	return { x: (dx / radius) * distance, y: (dy / radius) * distance };
}
