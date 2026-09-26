// Hand-written types for thought-field-particles.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too. The
// buildPalette element and the stepParticles pointer and meteors are
// typed as the structural shapes those functions read, so the Node
// suite needs no DOM or meteor types.

import type { LinearColour } from "./thought-field-maths.js";

export interface Pointer {
	x: number;
	y: number;
	strength: number;
	lastMove: number;
}

export interface Field {
	count: number;
	palette: LinearColour[];
	pos: Float32Array;
	col: Float32Array;
	base: Float32Array;
	phase: Float32Array;
	scale: Float32Array;
}

export interface StepParticlesOptions {
	field: Field;
	aspect: number;
	time: number;
	dt: number;
	pointer: Readonly<Pick<Pointer, "x" | "y" | "strength">>;
	meteors: {
		slots: ReadonlyArray<{ active: boolean; x: number; y: number }>;
	};
	// Share (0..1] of the drift's pull back to the layout; 1 without motion.
	calm: number;
}

export function buildPalette(element?: {
	append(...nodes: (object | string)[]): void;
}): {
	palette: LinearColour[];
	accent: LinearColour;
};
export function pointerStrength(lastMove: number, now: number): number;
export function makePoints(count: number, palette: LinearColour[]): Field;
export function stepParticles(options: StepParticlesOptions): void;
