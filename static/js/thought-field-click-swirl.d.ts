// Hand-written types for thought-field-click-swirl.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Click } from "./thought-field-clicks.js";
import type { Field } from "./thought-field-particles.js";

// The engine's live click; the spin and the waves depend on its serial.
export type SwirlClick = Click;

// The engine's force options, with only the parts of the field the
// forces read, so a test can build them without a whole field.
export interface ForceOptions {
	field: Pick<Field, "count" | "pos">;
	click: Readonly<SwirlClick>;
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
