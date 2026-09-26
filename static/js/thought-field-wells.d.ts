// Hand-written types for thought-field-wells.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Vec2 } from "./thought-field-vec.js";

// Circulation `spin` is positive anticlockwise.
export interface Well {
	x: number;
	y: number;
	spin: number;
	core2: number;
	age: number;
}

export interface WellTuning {
	core: number;
	spread: number;
	decay: number;
}

export interface EvolveOptions {
	wells: ReadonlyArray<Well>;
	dt: number;
	// The hero's half-width and half-height.
	half: Vec2;
	tuning: WellTuning;
}

export function swirlRate(spin: number, core2: number, r2: number): number;
export function clamp(value: number, limit: number): number;
export function evolveWells(options: EvolveOptions): Well[];
