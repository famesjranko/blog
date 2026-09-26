// Hand-written types for thought-field-fluid.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Fluid } from "./thought-field-grid.js";

export interface FluidStep {
	dt: number;
	// Field units²/s.
	viscosity: number;
	// Seconds for the front and back faces to stop the liquid.
	glassDrag: number;
}

export const PRESSURE_ITERATIONS: number;
export function project(fluid: Fluid, iterations: number): void;
export function stepFluid(fluid: Fluid, options: FluidStep): void;
export function fluidSpeed(fluid: Fluid): number;
