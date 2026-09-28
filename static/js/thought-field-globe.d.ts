// Hand-written types for thought-field-globe.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { GalaxyState, GalaxyTuning } from "./thought-field-galaxy.js";
import type {
	FilterState,
	FilterTuning,
} from "./thought-field-motion-filter.js";
import type { Field } from "./thought-field-particles.js";
import type { Vec2 } from "./thought-field-vec.js";

export interface GlobeTuning extends FilterTuning {
	shakeGain: number;
	drag: number;
	heavyLag: number;
	tiltGain: number;
	free: number;
	galaxy: GalaxyTuning;
}

// stepGlobe writes vel and flow in place, so a stepped or reseeded globe
// shares them with the globe it came from: only the newest one is live.
export interface Globe {
	readonly filter: FilterState;
	readonly galaxy: GalaxyState;
	readonly vel: Float32Array;
	readonly flow: Float32Array;
}

export interface GlobeStepOptions {
	globe: Globe;
	field: Pick<Field, "count" | "pos" | "scale">;
	// accelerationIncludingGravity in screen axes, m/s², or null before the first.
	sample: Vec2 | null;
	dt: number;
	// The hero's half-width; its half-height is 1.
	aspect: number;
	tuning: GlobeTuning;
}

export const GLOBE_TUNING: Readonly<GlobeTuning>;
export function makeGlobe(count: number): Globe;
export function reseedGlobe(globe: Globe): Globe;
export function stepGlobe(options: GlobeStepOptions): {
	globe: Globe;
	hold: number;
};
