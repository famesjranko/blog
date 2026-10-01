// Hand-written types for thought-field-click-swirl.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

// A live click in field space. `released` is the age at release, or -1
// while the press is held.
export interface SwirlClick {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	serial: number;
	released: number;
}

export interface ForceOptions {
	field: { count: number; pos: Float32Array };
	click: SwirlClick;
	dt: number;
	aspect: number;
}

export interface SwirlTuning {
	readonly vortexCirculation: number;
	readonly vortexCore: number;
	readonly vortexSpread: number;
	readonly vortexLife: number;
	readonly turbulenceRadius: number;
	readonly turbulenceAmplitude: number;
	readonly turbulenceWavenumber: number;
	readonly turbulenceChurn: number;
	readonly turbulenceLife: number;
}

export const SWIRL_TUNING: SwirlTuning;
export function vortexForce(options: ForceOptions): void;
export function turbulenceForce(options: ForceOptions): void;
