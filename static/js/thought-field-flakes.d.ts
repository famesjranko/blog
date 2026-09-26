// Hand-written types for thought-field-flakes.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Fluid } from "./thought-field-grid.js";
import type { Vec2 } from "./thought-field-vec.js";

// `vel` shares `pos`'s stride of 3, so one index reaches both.
export interface Flakes {
	pos: Float32Array;
	vel: Float32Array;
	scale: Float32Array;
	count: number;
}

export interface FlakeFrame {
	fluid: Fluid;
	dt: number;
	// Shake and tilt accelerations of a weight-1 flake, field units/s².
	jolt: Vec2;
	sink: Vec2;
	// Seconds for a weight-1 flake to catch up with the liquid.
	drag: number;
	spread: number;
	// One flake's mass over one grid cell's liquid.
	mass: number;
}

export function moveFlakes(flakes: Flakes, frame: FlakeFrame): number;
