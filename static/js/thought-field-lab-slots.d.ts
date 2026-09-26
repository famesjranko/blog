// Hand-written types for thought-field-lab-slots.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too.

import type { LabState } from "./thought-field-lab.js";
import type { LabStorage } from "./thought-field-lab-store.js";

export type Slots = ReadonlyArray<LabState | null>;

export interface SlotStore {
	slots: () => Slots;
	save: (index: number, state: LabState) => LabState;
}

export const SLOTS_KEY: string;
export const SLOT_COUNT: number;
export function slotName(index: number): string;
export function parseSlots(text: string | null): Slots;
export function serializeSlots(slots: Slots): string;
export function createSlotStore(storage: LabStorage | null): SlotStore;
