// Snow-globe flakes: each has its own velocity, is dragged toward the
// liquid's local velocity and pushes the reaction back into the grid.

import { sample, splat, splatWeight } from "./thought-field-grid.js";
import { sloshWeight } from "./thought-field-slosh.js";

/**
 * @typedef {import("./thought-field-grid.js").Channel} Channel
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 * @typedef {import("./thought-field-vec.js").Vec2} Vec2
 */

/**
 * `vel` shares `pos`'s stride of 3, so one index reaches both.
 * @typedef {{ pos: Float32Array, vel: Float32Array, scale: Float32Array, count: number }} Flakes
 */

/**
 * One step's inputs. `jolt` and `sink` are the shake and tilt
 * accelerations of a weight-1 flake (field units/s²), `drag` a weight-1
 * flake's catch-up time (s), `spread` how far weight follows size, and
 * `mass` one flake's mass over one grid cell's liquid.
 * @typedef {{
 *   fluid: Fluid,
 *   dt: number,
 *   jolt: Vec2,
 *   sink: Vec2,
 *   drag: number,
 *   spread: number,
 *   mass: number,
 * }} FlakeFrame
 */

/**
 * One axis of one flake: its `speed` and `accel`, its catch-up time
 * `tau` (s), and `mass` and `dt` from the frame.
 * @typedef {{ speed: number, accel: number, tau: number, mass: number, dt: number }} Axis
 */

/** @typedef {{ gx: number, gy: number }} GridPoint */

/**
 * Drags one axis of a flake and the liquid under it toward each other
 * and returns the flake's new speed. Solved exactly as two bodies, the
 * slip decaying at (1 + mu) / tau with momentum kept, so a heavy flake
 * never pushes the liquid past itself however long the step. The
 * reaction goes straight into the liquid, so the next flake feels it.
 * @param {Channel} channel
 * @param {GridPoint} at
 * @param {Axis} axis
 * @returns {number}
 */
function exchange(channel, at, { speed, accel, tau, mass, dt }) {
	const liquid = sample(channel, at.gx, at.gy);
	const mu = mass * splatWeight(channel, at.gx, at.gy);
	const drift = (accel * tau) / (1 + mu);
	const decay = Math.exp((-dt * (1 + mu)) / tau);
	const slip = drift + (speed - liquid - drift) * decay;
	const pushed = speed + accel * dt;
	const next = (mu * pushed + liquid + slip) / (1 + mu);
	splat(channel, at.gx, at.gy, mass * (pushed - next));
	return next;
}

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
 * Advances flake I and pushes its drag reaction into the liquid.
 * Heavier (bigger) flakes feel more of the jolt and the tilt and take
 * longer to catch up. Returns the flake's new speed.
 * @param {Flakes} flakes
 * @param {FlakeFrame} frame
 * @param {number} i
 * @returns {number}
 */
function moveFlake(flakes, frame, i) {
	const { pos, vel, scale } = flakes;
	const { fluid, dt, jolt, sink, mass } = frame;
	const k = i * 3;
	const weight = sloshWeight(scale[i], frame.spread);
	const tau = frame.drag * weight;
	const at = {
		gx: (pos[k] - fluid.left) / fluid.h,
		gy: (pos[k + 1] + 1) / fluid.h,
	};
	const ax = weight * (jolt.x + sink.x);
	const ay = weight * (jolt.y + sink.y);
	const nx = exchange(fluid.u, at, { speed: vel[k], accel: ax, tau, mass, dt });
	const ny = exchange(fluid.v, at, {
		speed: vel[k + 1],
		accel: ay,
		tau,
		mass,
		dt,
	});
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
