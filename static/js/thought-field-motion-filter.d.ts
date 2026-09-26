// Hand-written types for thought-field-motion-filter.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Vec2 } from "./thought-field-vec.js";

export interface FilterTuning {
	deadzone: number;
	tiltLean: number;
	tiltRecenter: number;
	gravitySmoothing: number;
	twistFloor: number;
	twistFull: number;
}

export interface FilterState {
	seeded: boolean;
	gravity: Vec2;
	neutral: Vec2;
}

export interface FilterOptions {
	state: FilterState;
	sample: Vec2 | null;
	dt: number;
	tuning: FilterTuning;
}

export interface Filtered {
	gravity: Vec2;
	neutral: Vec2;
	// Deadzoned high-pass of the reading, m/s² in screen axes.
	shake: Vec2;
	// Tilt lean in field units.
	lean: Vec2;
	// In-plane twist in rad/s, positive counter-clockwise looking at the screen.
	spin: number;
}

export function filterReading(options: FilterOptions): Filtered;
