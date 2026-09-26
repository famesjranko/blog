// Hand-written types for thought-field-lab.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { EngineKind, Settings } from "./thought-field-engine.js";
import type { SwirlStyle } from "./thought-field-globe.js";
import type { KnobGroup, ToggleName } from "./thought-field-lab-knobs.js";

export type KnobValues = Readonly<Record<string, number>>;

export interface LabState {
	engine: EngineKind;
	style: SwirlStyle;
	toggles: Readonly<Record<ToggleName, boolean>>;
	knobs: Readonly<Record<KnobGroup, KnobValues>>;
}

export const TOGGLE_NAMES: ToggleName[];
export const DEFAULT_LAB: Readonly<LabState>;
export function resolvedKnobs(state: LabState, group: KnobGroup): KnobValues;
export function resolveSettings(state: LabState): Settings;
export function setKnob(
	state: LabState,
	group: KnobGroup,
	key: string,
	value: number,
): LabState;
export function setToggle(
	state: LabState,
	name: ToggleName,
	on: boolean,
): LabState;
export function resetEngine(state: LabState): LabState;
export function exportLab(state: LabState): string;
