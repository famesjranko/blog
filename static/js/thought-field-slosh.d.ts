// Hand-written types for thought-field-slosh.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

export interface Vec2 {
	x: number;
	y: number;
}

export interface SloshTuning {
	shakeGain: number;
	deadzone: number;
	frequency: number;
	damping: number;
	tiltLean: number;
	tiltRecenter: number;
	gravitySmoothing: number;
	maxOffset: number;
	spread: number;
}

export interface SloshState {
	seeded: boolean;
	gravity: Vec2;
	neutral: Vec2;
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
}

export const SLOSH_TUNING: Readonly<SloshTuning>;
export function restingSlosh(): SloshState;
export function reseedSlosh(state: SloshState): SloshState;
export function stepSlosh(options: SloshStepOptions): SloshStep;
export function toScreenAxes(sample: Vec2, angle: number): Vec2;
export function sloshWeight(scale: number, spread: number): number;
