// Hand-written types for thought-field-click-radial.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file. The
// click and field are the parts of the engine's types the forces read,
// so a test can build them without a whole field.

import type { Click } from "./thought-field-clicks.js";
import type { Field } from "./thought-field-particles.js";

export type RadialClick = Pick<
	Click,
	"x" | "y" | "age" | "strength" | "released"
>;

export type RadialField = Pick<Field, "count" | "pos">;

export interface RadialForceOptions {
	field: RadialField;
	click: Readonly<RadialClick>;
	dt: number;
	// The hero's half-width; its half-height is 1.
	aspect: number;
}

export interface ShockwaveTuning {
	speed: number;
	width: number;
	span: number;
	push: number;
	radius: number;
	life: number;
}

export interface ImplodeTuning {
	pull: number;
	core: number;
	radius: number;
	life: number;
}

export interface AttractTuning {
	pull: number;
	rise: number;
	core: number;
	radius: number;
	life: number;
}

export interface GatherTuning {
	pull: number;
	floor: number;
	ramp: number;
	core: number;
	radius: number;
	burst: number;
	tap: number;
	life: number;
}

export interface RadialTuning {
	shockwave: Readonly<ShockwaveTuning>;
	implode: Readonly<ImplodeTuning>;
	attract: Readonly<AttractTuning>;
	gather: Readonly<GatherTuning>;
}

export const RADIAL_TUNING: Readonly<RadialTuning>;
export function shockwaveForce(options: RadialForceOptions): void;
export function implodeForce(options: RadialForceOptions): void;
export function attractForce(options: RadialForceOptions): void;
export function gatherForce(options: RadialForceOptions): void;
export function falloff(d: number, radius: number): number;
export function soften(d: number, core: number): number;
export function fade(t: number, life: number): number;
