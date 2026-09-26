// Snow-globe flakes: each has its own velocity, is dragged toward the
// liquid's local velocity and splats the reaction back onto the grid.

import { sample, splat } from "./thought-field-grid.js";
import { sloshWeight } from "./thought-field-slosh.js";

/**
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-vec.js").Vec2} Vec2
 */

/**
 * `vel` shares `pos`'s stride of 3, so one index reaches both.
 * @typedef {{ pos: Float32Array, vel: Float32Array, scale: Float32Array, count: number }} Flakes
 */

/**
 * One step's inputs. `jolt` and `sink` are the shake and tilt
 * accelerations of a weight-1 flake (field units/s²), `spinUp` the
 * change in twist rate (rad/s) whose Euler impulse is -spinUp × r,
 * `cos`/`sin` the Coriolis turn over the step, `spinSq` the twist rate
 * squared (the centrifugal Ω² r), `drag` a weight-1 flake's catch-up
 * time (s), `spread` how far weight follows size, and `share` the
 * liquid's gain per unit of speed a flake loses to drag.
 * @typedef {{
 *   fluid: Fluid,
 *   dt: number,
 *   jolt: Vec2,
 *   sink: Vec2,
 *   spinUp: number,
 *   cos: number,
 *   sin: number,
 *   spinSq: number,
 *   drag: number,
 *   spread: number,
 *   share: number,
 * }} FlakeFrame
 */

/**
 * Moves one coordinate of a flake at SPEED for the step. A flake that
 * would cross the container wall stops there; one the layout left
 * outside the wall only stops moving further out.
 * @param {Flakes} flakes
 * @param {FlakeFrame} frame
 * @param {number} k index into pos and vel
 * @param {number} speed
 */
function moveAxis(flakes, frame, k, speed) {
	const { pos, vel } = flakes;
	const half = k % 3 === 0 ? -frame.fluid.left : 1;
	const next = pos[k] + speed * frame.dt;
	const outward = speed > 0 ? next > half : next < -half;
	if (!outward) {
		pos[k] = next;
		vel[k] = speed;
		return;
	}
	pos[k] = speed > 0 ? Math.max(pos[k], half) : Math.min(pos[k], -half);
	vel[k] = 0;
}

/**
 * Advances flake I and splats its drag reaction onto the liquid.
 * Heavier (bigger) flakes feel more of the jolt and the tilt and take
 * longer to catch up. Returns the flake's new speed.
 * @param {Flakes} flakes
 * @param {FlakeFrame} frame
 * @param {number} i
 * @returns {number}
 */
function moveFlake(flakes, frame, i) {
	const { pos, vel, scale } = flakes;
	const { fluid, dt, jolt, sink, spinUp, cos, sin, spinSq, share } = frame;
	const k = i * 3;
	const weight = sloshWeight(scale[i], frame.spread);
	const x = pos[k];
	const y = pos[k + 1];
	// The twisting frame's Euler, Coriolis and centrifugal forces act on flake
	// and liquid alike; the flake has no pressure to cancel the centrifugal.
	const ex = vel[k] + spinUp * y;
	const ey = vel[k + 1] - spinUp * x;
	const vx = cos * ex + sin * ey;
	const vy = cos * ey - sin * ex;
	const ax = weight * (jolt.x + sink.x) + spinSq * x;
	const ay = weight * (jolt.y + sink.y) + spinSq * y;
	const gx = (x - fluid.left) / fluid.h;
	const gy = (y + 1) / fluid.h;
	const tau = frame.drag * weight;
	const keep = Math.exp(-dt / tau);
	// Exact solution of dv/dt = a + (u - v) / tau over the step.
	const tx = sample(fluid.u, gx, gy) + ax * tau;
	const ty = sample(fluid.v, gx, gy) + ay * tau;
	const nx = tx + (vx - tx) * keep;
	const ny = ty + (vy - ty) * keep;
	splat(fluid.u, gx, gy, share * (vx + ax * dt - nx));
	splat(fluid.v, gx, gy, share * (vy + ay * dt - ny));
	moveAxis(flakes, frame, k, nx);
	moveAxis(flakes, frame, k + 1, ny);
	return Math.sqrt(nx * nx + ny * ny);
}

/**
 * Advances every flake; returns their mean speed.
 * @param {Flakes} flakes
 * @param {FlakeFrame} frame
 * @returns {number}
 */
export function moveFlakes(flakes, frame) {
	let total = 0;
	for (let i = 0; i < flakes.count; i += 1) {
		total += moveFlake(flakes, frame, i);
	}
	return total / Math.max(1, flakes.count);
}
