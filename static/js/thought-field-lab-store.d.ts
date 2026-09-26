// Hand-written types for thought-field-lab-store.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { Settings } from "./thought-field-engine.js";
import type { LabState } from "./thought-field-lab.js";

export type LabStorage = {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
};

export interface LabStore {
	state: () => LabState;
	settings: () => Settings;
	update: (change: (state: LabState) => LabState) => void;
}

export const LAB_KEY: string;
export function labFromSaved(saved: unknown): LabState | null;
export function parseLab(text: string | null): LabState;
export function serializeLab(state: LabState): string;
export function createLabStore(storage: LabStorage | null): LabStore;
