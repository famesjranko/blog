// Hand-written types for thought-field-liquid.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Fluid } from "./thought-field-grid.js";
import type { Field } from "./thought-field-particles.js";
import type { SloshStep } from "./thought-field-slosh.js";

export interface LiquidTuning {
	shakeGain: number;
	tiltGain: number;
	drag: number;
	spread: number;
	coupling: number;
	viscosity: number;
	glassDrag: number;
	bubble: number;
	free: number;
}

// `vel` shares `pos`'s stride of 3.
export interface Liquid {
	fluid: Fluid;
	vel: Float32Array;
	hold: number;
}

export interface LiquidStepOptions {
	liquid: Liquid;
	field: Pick<Field, "pos" | "scale" | "count">;
	filtered: SloshStep;
	dt: number;
	// The hero's width over its height.
	aspect: number;
	tuning: LiquidTuning;
}

export const LIQUID_TUNING: Readonly<LiquidTuning>;
export function makeLiquid(count: number): Liquid;
export function stepLiquid(options: LiquidStepOptions): {
	liquid: Liquid;
	hold: number;
};
