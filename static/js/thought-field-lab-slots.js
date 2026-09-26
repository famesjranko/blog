// The ?tune lab's "Mine" slots: lab states the user saves to compare
// later, kept in localStorage apart from the live state. A missing or
// corrupt save leaves every slot empty. No DOM, so Node can test it.

import { labFromSaved, serializeLab } from "./thought-field-lab-store.js";
import { markLoaded } from "./thought-field-lab.js";

/**
 * @typedef {import("./thought-field-lab.js").LabState} LabState
 * @typedef {import("./thought-field-lab-store.js").LabStorage} LabStorage
 * @typedef {ReadonlyArray<LabState | null>} Slots
 * @typedef {{
 *   slots: () => Slots,
 *   save: (index: number, state: LabState) => LabState,
 * }} SlotStore
 */

export const SLOTS_KEY = "hero-lab-slots-v1";
export const SLOT_COUNT = 3;

/** @type {Slots} */
const EMPTY = Object.freeze(Array.from({ length: SLOT_COUNT }, () => null));

/**
 * The chip label of slot INDEX.
 * @param {number} index
 * @returns {string}
 */
export function slotName(index) {
	return `Mine ${index + 1}`;
}

/**
 * The slots saved as TEXT: each a lab state, or null where empty or out
 * of shape; all empty when TEXT is missing or not JSON.
 * @param {string | null} text
 * @returns {Slots}
 */
export function parseSlots(text) {
	/** @type {unknown} */
	let parsed = null;
	try {
		parsed = JSON.parse(text ?? "null");
	} catch {
		return EMPTY;
	}
	if (!Array.isArray(parsed)) {
		return EMPTY;
	}
	/** @type {ReadonlyArray<unknown>} */
	const saved = parsed;
	return EMPTY.map((_, index) => labFromSaved(saved[index]));
}

/**
 * @param {Slots} slots
 * @returns {string}
 */
export function serializeSlots(slots) {
	const saved = slots.map((slot) =>
		slot === null ? "null" : serializeLab(slot),
	);
	return `[${saved.join(",")}]`;
}

/**
 * The slots, loaded from STORAGE and saved back on every save. Storage
 * may be null or throw: the slots then last for this visit.
 * @param {LabStorage | null} storage
 * @returns {SlotStore}
 */
export function createSlotStore(storage) {
	/** @type {string | null} */
	let text = null;
	try {
		text = storage?.getItem(SLOTS_KEY) ?? null;
	} catch {
		text = null;
	}
	let slots = parseSlots(text);
	/** @type {SlotStore["save"]} */
	const save = (index, state) => {
		const kept = markLoaded(state, slotName(index));
		slots = slots.map((slot, at) => (at === index ? kept : slot));
		try {
			storage?.setItem(SLOTS_KEY, serializeSlots(slots));
		} catch {
			// Unsaved; the slot still holds it until the page reloads.
		}
		return kept;
	};
	return { slots: () => slots, save };
}
