// Stable-fluids step (Stam 1999) for the hero's snow-globe liquid on
// the grid from thought-field-grid.js: forces, implicit viscosity,
// pressure projection, semi-Lagrangian advection, projection again.

import { enforceWalls, sampleBuffer } from "./thought-field-grid.js";

/**
 * @typedef {import("./thought-field-grid.js").Channel} Channel
 * @typedef {import("./thought-field-grid.js").Fluid} Fluid
 */

/**
 * `viscosity` (field units²/s) calms small swirls first; `glassDrag`
 * (s) is how long the front and back faces take to stop the liquid,
 * the thin layer's friction that calms every swirl alike.
 * @typedef {{ dt: number, viscosity: number, glassDrag: number }} FluidStep
 */

export const PRESSURE_ITERATIONS = 20;
const DIFFUSE_ITERATIONS = 4;

/**
 * One Jacobi sweep of implicit diffusion, (1 - a∇²) result = src.
 * @param {Channel} channel
 * @param {number} a viscosity · dt / h²
 * @param {boolean} forward reads data into tmp when true, else back
 */
function relaxVelocity(channel, a, forward) {
	const { stride, lastI, lastJ, src } = channel;
	const from = forward ? channel.data : channel.tmp;
	const to = forward ? channel.tmp : channel.data;
	const scale = 1 / (1 + 4 * a);
	for (let j = 1; j <= lastJ; j += 1) {
		for (let i = 1; i <= lastI; i += 1) {
			const k = j * stride + i;
			const around = from[k - 1] + from[k + 1] + from[k - stride];
			to[k] = (src[k] + a * (around + from[k + stride])) * scale;
		}
	}
	enforceWalls(channel, forward ? "tmp" : "data");
}

/**
 * @param {Channel} channel
 * @param {number} a viscosity · dt / h²
 */
function diffuse(channel, a) {
	const { data, src } = channel;
	src.set(data);
	for (let n = 0; n < DIFFUSE_ITERATIONS; n += 2) {
		relaxVelocity(channel, a, true);
		relaxVelocity(channel, a, false);
	}
}

/**
 * Applies and clears the force accumulated since the last step, then
 * lets the glass faces in front and behind hold the liquid back.
 * @param {Channel} channel
 * @param {number} dt
 * @param {number} keep share of the speed the glass leaves this step
 */
function applyForce(channel, dt, keep) {
	const { data, force } = channel;
	for (let k = 0; k < data.length; k += 1) {
		data[k] = (data[k] + force[k] * dt) * keep;
	}
	force.fill(0);
	enforceWalls(channel, "data");
}

/**
 * Semi-Lagrangian transport of one component by the velocity in src.
 * @param {Fluid} fluid
 * @param {Channel} channel
 * @param {number} dt
 */
function advectChannel(fluid, channel, dt) {
	const { u, v, h } = fluid;
	const { data, src, stride, lastI, lastJ, sx, sy } = channel;
	const reach = dt / h;
	for (let j = 1; j <= lastJ; j += 1) {
		for (let i = 1; i <= lastI; i += 1) {
			const gx = i - sx;
			const gy = j - sy;
			const back = gx - reach * sampleBuffer(u, u.src, gx, gy);
			const down = gy - reach * sampleBuffer(v, v.src, gx, gy);
			data[j * stride + i] = sampleBuffer(channel, src, back, down);
		}
	}
	enforceWalls(channel, "data");
}

/**
 * @param {Fluid} fluid
 * @param {number} dt
 */
function advect(fluid, dt) {
	const { u, v } = fluid;
	u.src.set(u.data);
	v.src.set(v.data);
	advectChannel(fluid, u, dt);
	advectChannel(fluid, v, dt);
}

/**
 * Net outflow per unit area of every cell.
 * @param {Fluid} fluid
 */
function divergence(fluid) {
	const { u, v, div, cols, rows, stride, h } = fluid;
	const ud = u.data;
	const vd = v.data;
	for (let j = 1; j <= rows; j += 1) {
		for (let i = 1; i <= cols; i += 1) {
			const k = j * stride + i;
			div[k] = (ud[k] - ud[k - 1] + vd[k] - vd[k - stride]) / h;
		}
	}
}

/**
 * Copies the edge cells' pressure into the ghosts so no pressure
 * gradient pushes through a wall.
 * @param {Fluid} fluid
 * @param {boolean} forward fills p's ghosts when true, else pTmp's
 */
function pressureGhosts(fluid, forward) {
	const { cols, rows, stride } = fluid;
	const out = forward ? fluid.p : fluid.pTmp;
	const top = (rows + 1) * stride;
	for (let j = 1; j <= rows; j += 1) {
		out[j * stride] = out[j * stride + 1];
		out[j * stride + cols + 1] = out[j * stride + cols];
	}
	for (let i = 1; i <= cols; i += 1) {
		out[i] = out[stride + i];
		out[top + i] = out[top - stride + i];
	}
}

/**
 * One Jacobi sweep of ∇²p = div.
 * @param {Fluid} fluid
 * @param {boolean} forward reads p into pTmp when true, else back
 */
function relaxPressure(fluid, forward) {
	const { cols, rows, stride, h, div } = fluid;
	const from = forward ? fluid.p : fluid.pTmp;
	const to = forward ? fluid.pTmp : fluid.p;
	pressureGhosts(fluid, forward);
	const h2 = h * h;
	for (let j = 1; j <= rows; j += 1) {
		for (let i = 1; i <= cols; i += 1) {
			const k = j * stride + i;
			const around = from[k - 1] + from[k + 1] + from[k - stride];
			to[k] = (around + from[k + stride] - h2 * div[k]) * 0.25;
		}
	}
}

/**
 * @param {Fluid} fluid
 */
function subtractGradient(fluid) {
	const { u, v, p, cols, rows, stride, h } = fluid;
	const ud = u.data;
	const vd = v.data;
	for (let j = 1; j <= rows; j += 1) {
		for (let i = 1; i < cols; i += 1) {
			const k = j * stride + i;
			ud[k] -= (p[k + 1] - p[k]) / h;
		}
	}
	for (let j = 1; j < rows; j += 1) {
		for (let i = 1; i <= cols; i += 1) {
			const k = j * stride + i;
			vd[k] -= (p[k + stride] - p[k]) / h;
		}
	}
	enforceWalls(u, "data");
	enforceWalls(v, "data");
}

/**
 * Removes the divergent part of the velocity: whatever would compress
 * the liquid becomes pressure instead. Pressure is kept between calls
 * as the next solve's first guess.
 * @param {Fluid} fluid
 * @param {number} iterations rounded up to an even count
 */
export function project(fluid, iterations) {
	enforceWalls(fluid.u, "data");
	enforceWalls(fluid.v, "data");
	divergence(fluid);
	for (let n = 0; n < iterations; n += 2) {
		relaxPressure(fluid, true);
		relaxPressure(fluid, false);
	}
	subtractGradient(fluid);
}

/**
 * Advances the liquid by dt under the force splatted since last step.
 * @param {Fluid} fluid
 * @param {FluidStep} options
 */
export function stepFluid(fluid, { dt, viscosity, glassDrag }) {
	const keep = Math.exp(-dt / glassDrag);
	applyForce(fluid.u, dt, keep);
	applyForce(fluid.v, dt, keep);
	const a = (viscosity * dt) / (fluid.h * fluid.h);
	diffuse(fluid.u, a);
	diffuse(fluid.v, a);
	project(fluid, PRESSURE_ITERATIONS);
	advect(fluid, dt);
	project(fluid, PRESSURE_ITERATIONS);
}

/**
 * Root-mean-square speed over the interior faces, field units/s.
 * @param {Fluid} fluid
 * @returns {number}
 */
export function fluidSpeed(fluid) {
	return Math.sqrt(meanSquare(fluid.u) + meanSquare(fluid.v));
}

/**
 * @param {Channel} channel
 * @returns {number}
 */
function meanSquare(channel) {
	const { data, stride, lastI, lastJ } = channel;
	let sum = 0;
	for (let j = 1; j <= lastJ; j += 1) {
		for (let i = 1; i <= lastI; i += 1) {
			const value = data[j * stride + i];
			sum += value * value;
		}
	}
	return sum / (lastI * lastJ);
}
