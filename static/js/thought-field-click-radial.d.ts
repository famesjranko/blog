// Hand-written types for thought-field-click-radial.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file. The
// click and field are the structural shapes the forces read, so this
// module does not depend on the click engine's types.

// Field space: x in [-aspect, aspect], y in [-1, 1], y up.
export interface RadialClick {
	x: number;
	y: number;
	// Seconds since the press.
	age: number;
	// 1 is a normal press.
	strength: number;
	// The age at release, or -1 while held.
	released: number;
}

export interface RadialField {
	count: number;
	// x, y, z per particle.
	pos: Float32Array;
}

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
