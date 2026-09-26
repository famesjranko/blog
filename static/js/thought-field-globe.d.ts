// Hand-written types for thought-field-globe.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Field } from "./thought-field-particles.js";
import type { Vec2 } from "./thought-field-slosh.js";

export interface GlobeTuning {
	shakeStir: number;
	viscosity: number;
	swirlSpeed: number;
	eddySize: number;
	eddyDrift: number;
	shakeGain: number;
	drag: number;
	heavyLag: number;
	tiltGain: number;
	free: number;
}

export interface Globe {
	energy: number;
	vel: Float32Array;
	flow: Float32Array;
	waves: Float32Array;
}

export interface GlobeInput {
	shake: Vec2;
	lean: Vec2;
}

export interface GlobeStepOptions {
	globe: Globe;
	field: Pick<Field, "count" | "pos" | "scale">;
	input: GlobeInput;
	dt: number;
	time: number;
	tuning: GlobeTuning;
}

export interface FlowOptions {
	globe: Globe;
	field: Pick<Field, "count" | "pos">;
	flow: { energy: number; time: number };
	tuning: GlobeTuning;
}

export const GLOBE_TUNING: Readonly<GlobeTuning>;
export function makeGlobe(count: number): Globe;
export function homeHold(energy: number, tuning: GlobeTuning): number;
export function sampleFlow(options: FlowOptions): void;
export function stepGlobe(options: GlobeStepOptions): {
	globe: Globe;
	hold: number;
};
