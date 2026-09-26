// Hand-written types for thought-field-slosh.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type {
	FilterState,
	FilterTuning,
} from "./thought-field-motion-filter.js";
import type { Vec2 } from "./thought-field-vec.js";

export type { Vec2 };

export interface SloshTuning extends FilterTuning {
	shakeGain: number;
	frequency: number;
	damping: number;
	maxOffset: number;
	spread: number;
}

export interface SloshState extends FilterState {
	offset: Vec2;
	velocity: Vec2;
	shown: Vec2;
}

export interface SloshStepOptions {
	state: SloshState;
	sample: Vec2 | null;
	dt: number;
	tuning: SloshTuning;
}

export interface SloshStep {
	state: SloshState;
	shift: Vec2;
	delta: Vec2;
	// Deadzoned high-pass of the reading, m/s² in screen axes.
	shake: Vec2;
	// Tilt lean in field units.
	lean: Vec2;
	// In-plane twist in rad/s, positive counter-clockwise looking at the screen.
	spin: number;
}

export const SLOSH_TUNING: Readonly<SloshTuning>;
export function restingSlosh(): SloshState;
export function reseedSlosh(state: SloshState): SloshState;
export function stepSlosh(options: SloshStepOptions): SloshStep;
export function sloshWeight(scale: number, spread: number): number;
