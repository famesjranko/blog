// The rotational and noisy click forces of issue #40: a vortex whose
// spin alternates click by click, and a local turbulence. Each is a
// pure force over the field's positions, in field space (x in
// [-aspect, aspect], y in [-1, 1], y up), so Node can test it.

import { swirlRate } from "./thought-field-wells.js";

/**
 * The engine's live click. `released` is the age at release, or -1
 * while held.
 * @typedef {import("./thought-field-clicks.js").Click} SwirlClick
 */

/**
 * @typedef {{
 *   field: Pick<import("./thought-field-particles.js").Field, "count" | "pos">,
 *   click: Readonly<SwirlClick>,
 *   dt: number,
 *   aspect: number,
 * }} ForceOptions
 */

export const SWIRL_TUNING = Object.freeze({
	// Circulation Γ at strength 1, in field units²/s. With the birth core
	// this turns the centre at Γ / (2π·core²), about 2.8 rad/s.
	vortexCirculation: 0.25,
	// Core radius a at the press, in field units.
	vortexCore: 0.12,
	// Core diffusivity ν, in field units²/s: a² = core² + 4ν·age.
	vortexSpread: 0.012,
	// Seconds after release until the vortex has gone.
	vortexLife: 2.5,
	// Radius outside which the turbulence does nothing, in field units.
	turbulenceRadius: 0.35,
	// Stream-function amplitude at strength 1, in field units²/s.
	turbulenceAmplitude: 0.02,
	// Wavenumber of each wave in the stream function, in rad per field unit.
	turbulenceWavenumber: 18,
	// How fast the waves churn, in rad/s.
	turbulenceChurn: 2.5,
	// Seconds after release until the turbulence has gone.
	turbulenceLife: 2,
});

// Waves summed in the turbulence's stream function.
const WAVES = 3;

/**
 * The time envelope: 1 while held and at release, easing to 0 at LIFE
 * seconds after release, and 0 from then on.
 * @param {SwirlClick} click
 * @param {number} life
 * @returns {number}
 */
function fadeAfterRelease(click, life) {
	const since = click.released < 0 ? 0 : click.age - click.released;
	const left = Math.max(0, 1 - since / life);
	return left * left;
}

/**
 * Spins particles about the click as a spreading Lamb–Oseen vortex: the
 * same well as the galaxy swirl's, with even serials anticlockwise and
 * odd ones clockwise. Each particle turns by its angular rate times dt
 * about the centre, so it orbits instead of spiralling outward.
 * @param {ForceOptions} options
 */
export function vortexForce(options) {
	const { pos } = options.field;
	const { field, click, dt } = options;
	const tuning = SWIRL_TUNING;
	const fade = fadeAfterRelease(click, tuning.vortexLife);
	if (fade === 0) {
		return;
	}
	const sign = click.serial % 2 === 0 ? 1 : -1;
	const spin = sign * tuning.vortexCirculation * click.strength * fade;
	const core2 =
		tuning.vortexCore * tuning.vortexCore + 4 * tuning.vortexSpread * click.age;
	for (let i = 0; i < field.count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - click.x;
		const dy = pos[ix + 1] - click.y;
		const angle = swirlRate(spin, core2, dx * dx + dy * dy) * dt;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		pos[ix] = click.x + dx * cos - dy * sin;
		pos[ix + 1] = click.y + dx * sin + dy * cos;
	}
}

/**
 * A number in [0, 1) that depends only on SERIAL and SALT.
 * @param {number} serial
 * @param {number} salt
 * @returns {number}
 */
function hash(serial, salt) {
	let h =
		Math.imul(serial ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35);
	h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
	h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
	return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * The click's waves: a direction, phase and churn sign per wave, all
 * fixed by its serial.
 * @param {number} serial
 * @returns {{ kx: number, ky: number, phase: number, churn: number }[]}
 */
function wavesFor(serial) {
	const k = SWIRL_TUNING.turbulenceWavenumber;
	return Array.from({ length: WAVES }, (_, wave) => {
		const heading = 2 * Math.PI * hash(serial, 3 * wave);
		return {
			kx: k * Math.cos(heading),
			ky: k * Math.sin(heading),
			phase: 2 * Math.PI * hash(serial, 3 * wave + 1),
			churn: hash(serial, 3 * wave + 2) < 0.5 ? -1 : 1,
		};
	});
}

/**
 * The noise N = mean of sin(k·d + phase + churn·rate·age) at offset D, and
 * its gradient.
 * @param {ReturnType<typeof wavesFor>} waves
 * @param {{ dx: number, dy: number }} offset
 * @param {number} age
 * @returns {{ n: number, nx: number, ny: number }}
 */
function noiseAt(waves, offset, age) {
	const time = SWIRL_TUNING.turbulenceChurn * age;
	let n = 0;
	let nx = 0;
	let ny = 0;
	for (const wave of waves) {
		const arg =
			wave.kx * offset.dx +
			wave.ky * offset.dy +
			wave.phase +
			wave.churn * time;
		const cos = Math.cos(arg);
		n += Math.sin(arg) / WAVES;
		nx += (wave.kx * cos) / WAVES;
		ny += (wave.ky * cos) / WAVES;
	}
	return { n, nx, ny };
}

/**
 * Stirs particles near the click with a flow that is the curl of the
 * stream function ψ = E(r)·N, where E = (1 − r²/R²)² inside the radius R
 * and 0 outside. A curl has no divergence, so the flow neither bunches
 * nor thins the particles, and E's zero slope at R makes it fade in
 * smoothly at the edge. The waves depend only on the click's serial.
 * @param {ForceOptions} options
 */
export function turbulenceForce(options) {
	const { pos } = options.field;
	const { field, click, dt } = options;
	const tuning = SWIRL_TUNING;
	const fade = fadeAfterRelease(click, tuning.turbulenceLife);
	if (fade === 0) {
		return;
	}
	const scale = tuning.turbulenceAmplitude * click.strength * fade * dt;
	const radius2 = tuning.turbulenceRadius * tuning.turbulenceRadius;
	const waves = wavesFor(click.serial);
	for (let i = 0; i < field.count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - click.x;
		const dy = pos[ix + 1] - click.y;
		const inside = 1 - (dx * dx + dy * dy) / radius2;
		if (inside > 0) {
			const { n, nx, ny } = noiseAt(waves, { dx, dy }, click.age);
			// ψ = inside²·N, so ∂ψ/∂x = inside²·Nx − 4·inside·N·dx/R², and so for y.
			const slope = (-4 * inside * n) / radius2;
			const psiX = inside * inside * nx + slope * dx;
			const psiY = inside * inside * ny + slope * dy;
			pos[ix] += psiY * scale;
			pos[ix + 1] -= psiX * scale;
		}
	}
}
