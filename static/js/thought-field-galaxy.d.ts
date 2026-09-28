// Hand-written types for thought-field-galaxy.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Vec2 } from "./thought-field-vec.js";
import type { Well } from "./thought-field-wells.js";

export type { Well };

export interface GalaxyTuning {
	strength: number;
	core: number;
	spacing: number;
	jitter: number;
	quantum: number;
	cooldown: number;
	memory: number;
	decay: number;
	spread: number;
	spiral: number;
	full: number;
	maxWells: number;
}

export interface GalaxyState {
	wells: ReadonlyArray<Well>;
	impulse: number;
	stroke: Vec2;
	wait: number;
}

export interface GalaxyStepOptions {
	state: GalaxyState;
	// m/s², screen axes.
	shake: Vec2;
	dt: number;
	tuning: GalaxyTuning;
	// The hero's half-width; its half-height is 1.
	aspect: number;
}

export interface GalaxyFlowOptions {
	state: GalaxyState;
	// x, y, z per particle.
	pos: Float32Array;
	// x, y per particle; the galaxy velocity is added in.
	flow: Float32Array;
	count: number;
	tuning: GalaxyTuning;
}

export const GALAXY_TUNING: Readonly<GalaxyTuning>;
export function makeGalaxy(): GalaxyState;
export function addGalaxyFlow(options: GalaxyFlowOptions): void;
export function galaxyAgitation(
	state: GalaxyState,
	tuning: GalaxyTuning,
): number;
export function stepGalaxy(options: GalaxyStepOptions): GalaxyState;
