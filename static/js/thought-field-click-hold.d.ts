// Hand-written types for thought-field-click-hold.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type {
	RadialClick,
	RadialField,
	RadialForceOptions,
} from "./thought-field-click-radial.js";

export type HoldClick = RadialClick;
export type HoldField = RadialField;
export type HoldForceOptions = RadialForceOptions;

export interface WellTuning {
	pull: number;
	floor: number;
	ramp: number;
	core: number;
	radius: number;
	life: number;
}

export interface BloomTuning {
	push: number;
	from: number;
	to: number;
	grow: number;
	life: number;
}

export interface SpinTuning {
	speed: number;
	ramp: number;
	core: number;
	radius: number;
	life: number;
}

export interface HoldTuning {
	well: Readonly<WellTuning>;
	bloom: Readonly<BloomTuning>;
	spin: Readonly<SpinTuning>;
}

export const HOLD_TUNING: Readonly<HoldTuning>;
export function wellForce(options: HoldForceOptions): void;
export function bloomForce(options: HoldForceOptions): void;
export function spinForce(options: HoldForceOptions): void;
