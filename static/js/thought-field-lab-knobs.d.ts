// Hand-written types for thought-field-lab-knobs.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

export type KnobGroup = "slosh" | "swirl" | "pattern" | "galaxy" | "liquid";
// min, max, step, unit
export type Knob = readonly [number, number, number, string];
export type ToggleName = "lag" | "tilt" | "liquid" | "bubble";

export interface Toggle {
	label: string;
	knobs: ReadonlyArray<readonly [KnobGroup, string]>;
}

export const KNOBS: Readonly<Record<KnobGroup, Readonly<Record<string, Knob>>>>;
export const TOGGLES: Readonly<Record<ToggleName, Toggle>>;
