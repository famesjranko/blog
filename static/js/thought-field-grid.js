// Staggered (MAC) grid for the hero's snow-globe liquid: its layout,
// bilinear sampling and splatting, and the no-slip walls. Pure maths,
// no DOM, so Node can test it directly.

/**
 * One velocity component on its faces. Grid point (gx, gy) is array
 * column gx + sx, row gy + sy (index row · stride + column); faces 1..lastI
 * by 1..lastJ are interior, the rest walls or ghosts beyond them.
 * @typedef {{
 *   sx: number,
 *   sy: number,
 *   cols: number,
 *   rows: number,
 *   stride: number,
 *   lastI: number,
 *   lastJ: number,
 *   data: Float64Array,
 *   src: Float64Array,
 *   tmp: Float64Array,
 *   force: Float64Array,
 * }} Channel
 */

/**
 * Grid coordinates run 0..cols across and 0..rows up; field point
 * (x, y) sits at ((x - left) / h, (y + 1) / h). Cell (i, j), 1-based,
 * spans grid [i - 1, i] × [j - 1, j] and holds p and div.
 * @typedef {{
 *   cols: number,
 *   rows: number,
 *   h: number,
 *   stride: number,
 *   left: number,
 *   u: Channel,
 *   v: Channel,
 *   p: Float64Array,
 *   pTmp: Float64Array,
 *   div: Float64Array,
 * }} Fluid
 */

/** @typedef {"data" | "tmp"} Slot */

export const FLUID_ROWS = 20;
const MIN_COLS = 6;
const MAX_COLS = 60;

/** @type {(value: number, lo: number, hi: number) => number} */
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

/**
 * @param {number} aspect hero width over height
 * @returns {number}
 */
export function fluidCols(aspect) {
	return clamp(Math.round(FLUID_ROWS * aspect), MIN_COLS, MAX_COLS);
}

/**
 * @param {{ cols: number, rows: number, stride: number }} shape
 * @param {{ sx: number, sy: number, lastI: number, lastJ: number }} layout
 * @returns {Channel}
 */
function makeChannel(shape, layout) {
	const size = shape.stride * (shape.rows + 2);
	return {
		...shape,
		...layout,
		data: new Float64Array(size),
		src: new Float64Array(size),
		tmp: new Float64Array(size),
		force: new Float64Array(size),
	};
}

/**
 * A still liquid filling a box COLS cells wide and 2 field units tall,
 * centred on the field origin.
 * @param {number} cols
 * @param {number} [rows]
 * @returns {Fluid}
 */
export function makeFluid(cols, rows = FLUID_ROWS) {
	const stride = cols + 2;
	const h = 2 / rows;
	const shape = { cols, rows, stride };
	const size = stride * (rows + 2);
	return {
		cols,
		rows,
		h,
		stride,
		left: (-cols * h) / 2,
		u: makeChannel(shape, { sx: 0, sy: 0.5, lastI: cols - 1, lastJ: rows }),
		v: makeChannel(shape, { sx: 0.5, sy: 0, lastI: cols, lastJ: rows - 1 }),
		p: new Float64Array(size),
		pTmp: new Float64Array(size),
		div: new Float64Array(size),
	};
}

/**
 * Bilinear read of BUF, one of the channel's buffers, at (gx, gy). A
 * point outside the box reads at the nearest wall.
 * @param {Channel} channel
 * @param {Float64Array} buf
 * @param {number} gx
 * @param {number} gy
 * @returns {number}
 */
export function sampleBuffer(channel, buf, gx, gy) {
	const { sx, sy, cols, rows, stride } = channel;
	const fi = clamp(gx + sx, sx, cols + sx);
	const fj = clamp(gy + sy, sy, rows + sy);
	const i = Math.floor(fi);
	const j = Math.floor(fj);
	const tx = fi - i;
	const k = j * stride + i;
	const below = buf[k] + tx * (buf[k + 1] - buf[k]);
	const above = buf[k + stride] + tx * (buf[k + stride + 1] - buf[k + stride]);
	return below + (fj - j) * (above - below);
}

/**
 * The channel's velocity at grid point (gx, gy).
 * @param {Channel} channel
 * @param {number} gx
 * @param {number} gy
 * @returns {number}
 */
export function sample(channel, gx, gy) {
	return sampleBuffer(channel, channel.data, gx, gy);
}

/**
 * The lower-left face that sample reads at (gx, gy) and the point's
 * offsets from it.
 * @param {Channel} channel
 * @param {number} gx
 * @param {number} gy
 * @returns {{ k: number, tx: number, ty: number }}
 */
function corner(channel, gx, gy) {
	const { sx, sy, cols, rows, stride } = channel;
	const fi = clamp(gx + sx, sx, cols + sx);
	const fj = clamp(gy + sy, sy, rows + sy);
	const i = Math.floor(fi);
	const j = Math.floor(fj);
	return { k: j * stride + i, tx: fi - i, ty: fj - j };
}

/**
 * Adds AMOUNT to the channel's velocity with the weights sample reads.
 * @param {Channel} channel
 * @param {number} gx
 * @param {number} gy
 * @param {number} amount
 */
export function splat(channel, gx, gy, amount) {
	const { stride, data } = channel;
	const { k, tx, ty } = corner(channel, gx, gy);
	data[k] += (1 - tx) * (1 - ty) * amount;
	data[k + 1] += tx * (1 - ty) * amount;
	data[k + stride] += (1 - tx) * ty * amount;
	data[k + stride + 1] += tx * ty * amount;
}

/**
 * The sum of the squared weights at (gx, gy): how much of a splat there
 * the sample at the same point reads back.
 * @param {Channel} channel
 * @param {number} gx
 * @param {number} gy
 * @returns {number}
 */
export function splatWeight(channel, gx, gy) {
	const { tx, ty } = corner(channel, gx, gy);
	return ((1 - tx) ** 2 + tx ** 2) * ((1 - ty) ** 2 + ty ** 2);
}

/**
 * Walls for u: zero on the left and right walls it crosses; the ghost
 * rows beyond the floor and ceiling mirror it so it is 0 at the wall.
 * @param {Channel} channel
 * @param {Slot} slot
 */
function wallsForU(channel, slot) {
	const buf = channel[slot];
	const { cols, rows, stride } = channel;
	for (let j = 0; j <= rows + 1; j += 1) {
		buf[j * stride] = 0;
		buf[j * stride + cols] = 0;
	}
	const top = (rows + 1) * stride;
	for (let i = 0; i <= cols; i += 1) {
		buf[i] = -buf[stride + i];
		buf[top + i] = -buf[top - stride + i];
	}
}

/**
 * Walls for v: zero on the floor and ceiling it crosses; the ghost
 * columns beyond the side walls mirror it so it is 0 at the wall.
 * @param {Channel} channel
 * @param {Slot} slot
 */
function wallsForV(channel, slot) {
	const buf = channel[slot];
	const { cols, rows, stride } = channel;
	for (let i = 0; i <= cols + 1; i += 1) {
		buf[i] = 0;
		buf[rows * stride + i] = 0;
	}
	for (let j = 0; j <= rows; j += 1) {
		buf[j * stride] = -buf[j * stride + 1];
		buf[j * stride + cols + 1] = -buf[j * stride + cols];
	}
}

/**
 * No-slip, no-flux walls on one of the channel's buffers.
 * @param {Channel} channel
 * @param {Slot} slot
 */
export function enforceWalls(channel, slot) {
	if (channel.sx === 0) {
		wallsForU(channel, slot);
	} else {
		wallsForV(channel, slot);
	}
}
