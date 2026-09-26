// Point-vortex physics for the galaxy swirl: the smooth-cored
// (Lamb–Oseen) vortex, or "well", its flow, and how a set of wells
// carry one another about inside the hero's walls while they fade and
// spread. Pure maths, no DOM or sensor APIs, so Node can test it.

import { vec } from "./thought-field-vec.js";

/** @typedef {import("./thought-field-vec.js").Vec2} Vec2 */

/**
 * One smooth-cored vortex: centre, circulation `spin` (positive
 * anticlockwise, field units²/s), squared core radius and age (s).
 * @typedef {{ x: number, y: number, spin: number, core2: number, age: number }} Well
 */

/**
 * `core` the birth core radius and `spread` the core's diffusivity ν,
 * both in field units (², per s); `decay` the circulation's e-folding
 * time in seconds.
 * @typedef {{ core: number, spread: number, decay: number }} WellTuning
 */

/**
 * `half` is the hero's half-width and half-height.
 * @typedef {{
 *   wells: ReadonlyArray<Well>,
 *   dt: number,
 *   half: Vec2,
 *   tuning: WellTuning,
 * }} EvolveOptions
 */

const TWO_PI = 2 * Math.PI;

/**
 * Lamb–Oseen angular rate at squared distance r2: the velocity is this
 * times (−dy, dx), that is Γ / (2πr²) · (1 − e^(−r²/a²)) · (−dy, dx).
 * Its r2 → 0 limit is solid-body rotation.
 * @param {number} spin
 * @param {number} core2
 * @param {number} r2
 * @returns {number}
 */
export function swirlRate(spin, core2, r2) {
	if (r2 <= 1e-9 * core2) {
		return spin / (TWO_PI * core2);
	}
	return (-spin * Math.expm1(-r2 / core2)) / (TWO_PI * r2);
}

/**
 * The velocity every source except POINT itself induces at POINT.
 * @param {ReadonlyArray<Well>} sources
 * @param {Well} point
 * @returns {Vec2}
 */
function inducedAt(sources, point) {
	let vx = 0;
	let vy = 0;
	for (const source of sources) {
		if (source !== point) {
			const dx = point.x - source.x;
			const dy = point.y - source.y;
			const rate = swirlRate(source.spin, source.core2, dx * dx + dy * dy);
			vx -= rate * dy;
			vy += rate * dx;
		}
	}
	return vec(vx, vy);
}

/**
 * The well's opposite-spinning images across the hero's four walls:
 * with them, no flow crosses a wall, so a well nearing one is turned
 * along it instead of leaving.
 * @param {Well} well
 * @param {Vec2} half
 * @returns {Well[]}
 */
function mirrors(well, half) {
	const spin = -well.spin;
	return [
		{ ...well, spin, x: 2 * half.x - well.x },
		{ ...well, spin, x: -2 * half.x - well.x },
		{ ...well, spin, y: 2 * half.y - well.y },
		{ ...well, spin, y: -2 * half.y - well.y },
	];
}

/** @type {(value: number, limit: number) => number} */
export const clamp = (value, limit) => Math.min(limit, Math.max(-limit, value));

/**
 * Moves each well with the flow of the others and of the walls' images,
 * then fades its circulation and spreads its core, a² = core² + 4ν·age.
 * @param {EvolveOptions} options
 * @returns {Well[]}
 */
export function evolveWells(options) {
	const { wells, dt, half, tuning } = options;
	const sources = [...wells, ...wells.flatMap((well) => mirrors(well, half))];
	const fade = Math.exp(-dt / tuning.decay);
	return wells.map((well) => {
		const drift = inducedAt(sources, well);
		const age = well.age + dt;
		return {
			// Clamped only as a backstop: the images already turn wells short of the walls.
			x: clamp(well.x + drift.x * dt, half.x),
			y: clamp(well.y + drift.y * dt, half.y),
			spin: well.spin * fade,
			core2: tuning.core * tuning.core + 4 * tuning.spread * age,
			age,
		};
	});
}
