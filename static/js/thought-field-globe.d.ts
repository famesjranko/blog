// Hand-written types for thought-field-globe.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { GalaxyState, GalaxyTuning } from "./thought-field-galaxy.js";
import type { Field } from "./thought-field-particles.js";
import type { PatternTuning } from "./thought-field-pattern.js";
import type { Vec2 } from "./thought-field-slosh.js";

export type SwirlStyle = "pattern" | "galaxy" | "off";

export interface GlobeTuning {
	swirl: SwirlStyle;
	shakeStir: number;
	viscosity: number;
	shakeGain: number;
	drag: number;
	heavyLag: number;
	tiltGain: number;
	free: number;
	pattern: PatternTuning;
	galaxy: GalaxyTuning;
}

export interface Globe {
	energy: number;
	galaxy: GalaxyState;
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
	// The hero's half-width; its half-height is 1.
	aspect: number;
	tuning: GlobeTuning;
}

export const GLOBE_TUNING: Readonly<GlobeTuning>;
export function makeGlobe(count: number): Globe;
export function homeHold(energy: number, tuning: GlobeTuning): number;
export function globeAgitation(globe: Globe, tuning: GlobeTuning): number;
export function stepGlobe(options: GlobeStepOptions): {
	globe: Globe;
	hold: number;
};
