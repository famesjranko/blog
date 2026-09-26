// Forces that stir the snow-globe liquid besides the flakes' drag. A
// uniform push is pure pressure in a full box and moves nothing, so
// only the container's twist and a part-full globe's shake stir it.

import { enforceWalls, sample } from "./thought-field-grid.js";

/**
 * @typedef {import("./thought-field-grid.js").Channel} Channel
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-slosh.js").Vec2} Vec2
 */

/**
 * `spin` is the container's turning rate (rad/s, positive
 * counter-clockwise) and `spinUp` its change since the last step.
 * @typedef {{ spinUp: number, spin: number, dt: number }} Twist
 */

/**
 * Calls VISIT with the index and grid position of every interior face.
 * @param {Channel} channel
 * @param {(k: number, gx: number, gy: number) => void} visit
 */
function eachFace(channel, visit) {
	const { stride, lastI, lastJ, sx, sy } = channel;
	for (let j = 1; j <= lastJ; j += 1) {
		for (let i = 1; i <= lastI; i += 1) {
			visit(j * stride + i, i - sx, j - sy);
		}
	}
}

/**
 * The container's frame turns under the liquid, which feels the Euler
 * force -dΩ/dt × r (here its impulse over the step, -spinUp × r about
 * the hero centre) and the Coriolis force -2Ω × u. Updating u before v
 * keeps the Coriolis turn from gaining energy at large spin · dt.
 * @param {Fluid} fluid
 * @param {Twist} twist
 */
export function twistFluid(fluid, { spinUp, spin, dt }) {
	const { u, v, h, left } = fluid;
	const ud = u.data;
	const vd = v.data;
	const coriolis = 2 * spin * dt;
	eachFace(u, (k, gx, gy) => {
		ud[k] += spinUp * (gy * h - 1) + coriolis * sample(v, gx, gy);
	});
	enforceWalls(u, "data");
	eachFace(v, (k, gx, gy) => {
		vd[k] -= spinUp * (left + gx * h) + coriolis * sample(u, gx, gy);
	});
	enforceWalls(v, "data");
}

/**
 * A part-full globe: the liquid nearer the air bubble, which sits along
 * UP, takes more of the shake, so PUSH (field units/s², the share felt
 * at the very top) varies with height and survives the projection. The
 * profile runs -½..½ rather than 0..1: its mean is uniform, so pressure.
 * @param {Fluid} fluid
 * @param {Vec2} push across UP, which is a unit vector
 * @param {Vec2} up
 */
export function shakeFluid(fluid, push, up) {
	const { u, v, h, left } = fluid;
	const uf = u.force;
	const vf = v.force;
	const reach = 2 * (Math.abs(up.x) * -left + Math.abs(up.y));
	/** @type {(gx: number, gy: number) => number} */
	const height = (gx, gy) =>
		((left + gx * h) * up.x + (gy * h - 1) * up.y) / reach;
	eachFace(u, (k, gx, gy) => {
		uf[k] += push.x * height(gx, gy);
	});
	eachFace(v, (k, gx, gy) => {
		vf[k] += push.y * height(gx, gy);
	});
}
