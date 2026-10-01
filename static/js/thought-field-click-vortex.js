import { evolveWells, swirlRate } from "./thought-field-wells.js";

/**
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: "vortex-alternate" | "vortex-position", phase?: number,
 *   heldFor?: number, spin?: number }} VortexEvent
 */

const LIFETIME = 3;
const CORE = 0.12;
const SPREAD = 0.008;
const DECAY = 1.1;
const MAX_WELLS = 3;
const TUNING = { core: CORE, spread: SPREAD, decay: DECAY };

/**
 * Alternating clicks use the caller's event sequence number. Positioned
 * clicks use the horizontal half of the field, with centre assigned left.
 * @param {VortexEvent} event
 * @returns {number}
 */
function initialSpin(event) {
	if (event.mode === "vortex-position") {
		return event.x > 0 ? -1 : 1;
	}
	return Math.abs(Math.trunc(event.phase ?? 0)) % 2 === 0 ? 1 : -1;
}

/**
 * @param {VortexEvent} event
 * @returns {number}
 */
function circulation(event) {
	return (
		event.spin ??
		initialSpin(event) * event.strength * Math.exp(-event.age / DECAY)
	);
}

/**
 * The temporary force added to one particle this frame. The smooth core
 * avoids a singularity at the click, while the outer taper keeps it local.
 * @param {{ x: number, y: number, event: VortexEvent, dt: number, aspect: number }} options
 * @returns {{ x: number, y: number }}
 */
export function effect(options) {
	const { x, y, event, dt, aspect } = options;
	const zero = { x: 0, y: 0 };
	if (
		![x, y, dt, aspect, event.x, event.y, event.age, event.strength].every(
			Number.isFinite,
		) ||
		!(dt > 0 && aspect > 0 && event.age >= 0 && event.age < LIFETIME)
	) {
		return zero;
	}
	const spin = circulation(event);
	if (!Number.isFinite(spin)) {
		return zero;
	}
	const dx = x - event.x;
	const dy = y - event.y;
	const r2 = dx * dx + dy * dy;
	const radius2 = (0.42 + 0.08 * event.age) ** 2;
	const taper = Math.exp(-r2 / radius2);
	const grow = Math.min(1, event.age / 0.18);
	const fade = Math.min(1, (LIFETIME - event.age) / 0.45);
	const core2 = CORE * CORE + 4 * SPREAD * event.age;
	const step =
		swirlRate(spin, core2, r2) * taper * grow * fade * Math.min(dt, 0.05);
	return { x: -dy * step, y: dx * step };
}

/**
 * Advance up to three recent vortices. Wells carry one another around;
 * their circulation fades and their cores spread while they age.
 * @param {ReadonlyArray<VortexEvent>} events
 * @param {number} dt
 * @param {number} aspect
 * @returns {VortexEvent[]}
 */
export function evolveVortices(events, dt, aspect) {
	if (
		!(dt > 0) ||
		!Number.isFinite(dt) ||
		!(aspect > 0) ||
		!Number.isFinite(aspect)
	) {
		return events.slice(-MAX_WELLS);
	}
	const active = events
		.filter((event) => event.age >= 0 && event.age + dt < LIFETIME)
		.slice(-MAX_WELLS);
	const wells = active.map((event) => ({
		x: event.x,
		y: event.y,
		age: event.age,
		spin: circulation(event),
		core2: CORE * CORE + 4 * SPREAD * event.age,
	}));
	const moved = evolveWells({
		wells,
		dt,
		half: { x: aspect, y: 1 },
		tuning: TUNING,
	});
	return active.map((event, index) => {
		const well = moved[index];
		if (well === undefined) {
			return event;
		}
		return { ...event, x: well.x, y: well.y, age: well.age, spin: well.spin };
	});
}
