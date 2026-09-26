// Hand-written types for thought-field-pattern.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

export interface PatternTuning {
	swirlSpeed: number;
	eddySize: number;
	eddyDrift: number;
}

export interface PatternFlowOptions {
	waves: Float32Array;
	// x, y, z per particle.
	pos: Float32Array;
	// x, y per particle; overwritten.
	flow: Float32Array;
	count: number;
	sweep: { energy: number; time: number };
	tuning: PatternTuning;
}

export const PATTERN_TUNING: Readonly<PatternTuning>;
export function makeWaves(): Float32Array;
export function sampleFlow(options: PatternFlowOptions): void;
