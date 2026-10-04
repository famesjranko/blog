// Hand-written types for thought-field-clicks.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Field } from "./thought-field-particles.js";

// A live click in field space: x in [-aspect, aspect], y in [-1, 1], y up.
// `released` is the age at release, or -1 while the press is held.
export interface Click {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	serial: number;
	released: number;
}

export interface ForceOptions {
	field: Field;
	click: Readonly<Click>;
	dt: number;
	aspect: number;
}

// Moves field.pos in place for one click over DT.
export type Force = (options: ForceOptions) => void;

// `life` counts seconds after release. A mode without `hold` releases
// its click at press. `yieldHover` silences the pointer hover while a
// click is held and returns it over HOVER_RETURN after release; absent,
// the hover runs as normal.
export interface ClickMode {
	id: string;
	label: string;
	hold: boolean;
	life: number;
	yieldHover?: true;
	force: Force;
}

export interface StepOptions {
	field: Field;
	dt: number;
	aspect: number;
}

// What the frame loop calls after stepParticles.
export interface ClickSource {
	step(options: StepOptions): void;
	// Scale in [0, 1] for the pointer hover strength this frame.
	hover(): number;
}

export interface ClickField extends ClickSource {
	mode(): ClickMode;
	live(): ReadonlyArray<Click>;
	// Returns the serial that `release` takes.
	press(x: number, y: number): number;
	release(serial: number): void;
	// Clears every live click.
	setMode(mode: ClickMode): void;
}

export const MAX_LIVE: number;
export const HOLD_LIMIT: number;
export const HOVER_RETURN: number;
export function pressClick(
	live: ReadonlyArray<Click>,
	press: { x: number; y: number; mode: ClickMode; serial: number },
): Click[];
export function releaseClick(
	live: ReadonlyArray<Click>,
	serial: number,
): Click[];
export function advanceClicks(
	live: ReadonlyArray<Click>,
	mode: ClickMode,
	dt: number,
): Click[];
export function applyClicks(
	options: StepOptions & { live: ReadonlyArray<Click>; mode: ClickMode },
): void;
export function hoverScale(live: ReadonlyArray<Click>, mode: ClickMode): number;
export function createClicks(initial: ClickMode): ClickField;
