// Presets row and "Mine" slots for the ?tune lab panel: chips that load
// a preset or a saved state, each replacing the whole lab state, with
// the active one highlighted and marked once a control changes it.

import { markLoaded } from "./thought-field-lab.js";
import { PRESETS, presetState } from "./thought-field-lab-presets.js";
import { SLOT_COUNT, slotName } from "./thought-field-lab-slots.js";
import {
	CHIP_ROW,
	button,
	chipStyle,
	el,
	heading,
} from "./thought-field-lab-widgets.js";

/**
 * @typedef {import("./thought-field-lab.js").LabState} LabState
 * @typedef {import("./thought-field-lab.js").PresetMark} PresetMark
 * @typedef {import("./thought-field-lab-store.js").LabStore} LabStore
 * @typedef {import("./thought-field-lab-slots.js").SlotStore} SlotStore
 * @typedef {{
 *   store: LabStore,
 *   slots: SlotStore,
 *   load: (state: LabState) => void,
 * }} PresetOptions
 * @typedef {{ element: HTMLElement, refresh: () => void }} PresetPicker
 * @typedef {{ name: string, node: HTMLButtonElement, slot: number | null }} Chip
 */

const STATUS = "min-height: 20px; font-size: 12px; color: #9fb0c0";
const SAVE = "flex: none; padding: 0 10px; font-size: 12px";

/**
 * NAME's chip text, marked once the active preset or slot is changed.
 * @param {string} name
 * @param {PresetMark} mark
 * @returns {string}
 */
function chipText(name, mark) {
	return mark?.name === name && mark.modified ? `${name} · modified` : name;
}

/**
 * The chips and save buttons of the "Mine" slots. Tapping an empty slot
 * says so; save stores the current state there and marks it loaded.
 * @param {PresetOptions} options
 * @param {(text: string) => void} say
 * @returns {{ chips: Chip[], row: HTMLDivElement }}
 */
function slotControls(options, say) {
	const { store, slots, load } = options;
	const row = el("div", CHIP_ROW);
	const chips = Array.from({ length: SLOT_COUNT }, (_, slot) => {
		const name = slotName(slot);
		const open = () => {
			const saved = slots.slots()[slot] ?? null;
			if (saved === null) {
				say(`${name} is empty: save stores the current settings there.`);
				return;
			}
			say("");
			load(markLoaded(saved, name));
		};
		const save = () => {
			load(slots.save(slot, store.state()));
			say(`Saved to ${name}.`);
		};
		const node = button(name, open);
		row.append(node, button("save", save, SAVE));
		return { name, node, slot };
	});
	return { chips, row };
}

/**
 * Mounts the presets row and the slots; `refresh` repaints the chips
 * after the state changes.
 * @param {PresetOptions} options
 * @returns {PresetPicker}
 */
export function mountPresets(options) {
	const { store, slots, load } = options;
	const status = el("div", STATUS);
	/** @param {string} text */
	const say = (text) => status.replaceChildren(text);
	const presetRow = el("div", CHIP_ROW);
	/** @type {Chip[]} */
	const presetChips = PRESETS.map((preset) => {
		const pick = () => {
			say("");
			load(presetState(preset));
		};
		return { name: preset.name, node: button(preset.name, pick), slot: null };
	});
	presetRow.append(...presetChips.map((chip) => chip.node));
	const mine = slotControls(options, say);
	const refresh = () => {
		const mark = store.state().preset;
		const saved = slots.slots();
		for (const { name, node, slot } of [...presetChips, ...mine.chips]) {
			const empty = slot !== null && saved[slot] === null;
			node.setAttribute("style", chipStyle(mark?.name === name, empty));
			node.replaceChildren(chipText(name, mark));
		}
	};
	const element = el("div", "");
	element.append(heading("Presets"), presetRow, heading("Mine"), mine.row);
	element.append(status);
	refresh();
	return { element, refresh };
}
