// Hand-written types for thought-field-engine.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Globe, GlobeTuning } from "./thought-field-globe.js";
import type { Liquid, LiquidTuning } from "./thought-field-liquid.js";
import type { Field } from "./thought-field-particles.js";
import type { SloshStep, SloshTuning } from "./thought-field-slosh.js";

export type EngineKind = "swirl" | "liquid";

export interface Settings {
	engine: EngineKind;
	slosh: SloshTuning;
	swirl: GlobeTuning;
	liquid: LiquidTuning;
}

export type Engine =
	| { kind: "swirl"; globe: Globe }
	| { kind: "liquid"; liquid: Liquid };

export interface EngineStepOptions {
	engine: Engine;
	settings: Settings;
	field: Pick<Field, "pos" | "scale" | "count">;
	filtered: SloshStep;
	dt: number;
	time: number;
	// The hero's width over its height.
	aspect: number;
}

export const DEFAULT_SETTINGS: Readonly<Settings>;
export function makeEngine(kind: EngineKind, count: number): Engine;
export function stepEngine(options: EngineStepOptions): {
	engine: Engine;
	hold: number;
};
