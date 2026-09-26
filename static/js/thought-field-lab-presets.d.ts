// Hand-written types for thought-field-lab-presets.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { EngineKind } from "./thought-field-engine.js";
import type { SwirlStyle } from "./thought-field-globe.js";
import type { KnobValues, LabState } from "./thought-field-lab.js";
import type { KnobGroup, ToggleName } from "./thought-field-lab-knobs.js";

export interface Preset {
	name: string;
	engine: EngineKind;
	style?: SwirlStyle;
	toggles?: Partial<Record<ToggleName, boolean>>;
	knobs?: Partial<Record<KnobGroup, KnobValues>>;
}

export const PRESETS: ReadonlyArray<Readonly<Preset>>;
export function presetState(preset: Readonly<Preset>): LabState;
