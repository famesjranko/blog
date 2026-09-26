// Hand-written types for thought-field-grid.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

// Grid point (gx, gy) is array column gx + sx, row gy + sy, at index
// row * stride + column. Faces 1..lastI by 1..lastJ are interior.
export interface Channel {
	sx: number;
	sy: number;
	cols: number;
	rows: number;
	stride: number;
	lastI: number;
	lastJ: number;
	data: Float64Array;
	src: Float64Array;
	tmp: Float64Array;
	force: Float64Array;
}

// Grid coordinates run 0..cols across and 0..rows up; field point
// (x, y) sits at ((x - left) / h, (y + 1) / h).
export interface Fluid {
	cols: number;
	rows: number;
	h: number;
	stride: number;
	left: number;
	u: Channel;
	v: Channel;
	p: Float64Array;
	pTmp: Float64Array;
	div: Float64Array;
}

export type Slot = "data" | "tmp";

export const FLUID_ROWS: number;
export function fluidCols(aspect: number): number;
export function makeFluid(cols: number, rows?: number): Fluid;
export function sampleBuffer(
	channel: Channel,
	buf: Float64Array,
	gx: number,
	gy: number,
): number;
export function sample(channel: Channel, gx: number, gy: number): number;
export function splat(
	channel: Channel,
	gx: number,
	gy: number,
	amount: number,
): void;
export function splatWeight(channel: Channel, gx: number, gy: number): number;
export function enforceWalls(channel: Channel, slot: Slot): void;
