// The air bubble of a part-full snow globe. A uniform push is pure
// pressure in a full box and moves nothing, but the liquid nearer the
// bubble takes more of a shake, so the push varies with height and
// stirs the liquid besides the flakes' drag.

import { scaled, sub } from "./thought-field-vec.js";

/**
 * @typedef {import("./thought-field-grid.js").Channel} Channel
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-vec.js").Vec2} Vec2
 */

/**
 * `shake` (m/s²) is the phone's jolt, `gravity` (m/s²) the settled
 * reading pointing up, and `gain` the push per m/s² of shake that the
 * very top of the liquid takes (field units/s²).
 * @typedef {{ shake: Vec2, gravity: Vec2, gain: number }} BubbleShake
 */

const ONE_G = 9.81; // m/s²

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
 * The push at the top: the shake across UP, the in-plane way away from
 * gravity, weaker as the phone lies flatter. Null when flat.
 * @param {BubbleShake} options
 * @returns {{ push: Vec2, up: Vec2 } | null}
 */
function bubblePush({ shake, gravity, gain }) {
	const g = Math.hypot(gravity.x, gravity.y);
	if (g < 0.01 || gain === 0) {
		return null;
	}
	const up = scaled(gravity, 1 / g);
	const along = shake.x * up.x + shake.y * up.y;
	const across = sub(shake, scaled(up, along));
	return { push: scaled(across, -gain * Math.min(1, g / ONE_G)), up };
}

/**
 * Adds the bubble's share of the shake to the liquid's force. The
 * bubble sits along UP; the height profile runs -½..½ rather than 0..1
 * because its mean is uniform, so pressure.
 * @param {Fluid} fluid
 * @param {BubbleShake} options
 */
export function shakeBubble(fluid, options) {
	const found = bubblePush(options);
	if (found === null) {
		return;
	}
	const { push, up } = found;
	const { u, v, h, left } = fluid;
	const reach = 2 * (Math.abs(up.x) * -left + Math.abs(up.y));
	/** @type {(gx: number, gy: number) => number} */
	const height = (gx, gy) =>
		((left + gx * h) * up.x + (gy * h - 1) * up.y) / reach;
	eachFace(u, (k, gx, gy) => {
		u.force[k] += push.x * height(gx, gy);
	});
	eachFace(v, (k, gx, gy) => {
		v.force[k] += push.y * height(gx, gy);
	});
}
