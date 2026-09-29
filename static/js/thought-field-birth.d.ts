// Hand-written types for thought-field-birth.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Field } from "./thought-field-particles.js";

export interface BirthTuning {
	duration: number;
	spread: number;
	haze: number;
	glow: number;
}

export interface BirthStepOptions {
	field: Pick<Field, "count" | "pos" | "alpha" | "base" | "phase">;
	// Per particle: start share, then haze offset on x and y, each in [0, 1).
	seeds: Float32Array;
	age: number;
	aspect: number;
	time: number;
	tuning: BirthTuning;
}

export const BIRTH_TUNING: Readonly<BirthTuning>;
export function makeSeeds(count: number): Float32Array;
export function stepBirth(options: BirthStepOptions): boolean;
