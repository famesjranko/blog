// The click modes the hero demo switches between, in panel order. `off`
// is the hero with no click interaction, kept for comparison.
import { scatter } from "./thought-field-click-scatter.js";

/** @typedef {import("./thought-field-clicks.js").ClickMode} ClickMode */

/** @type {ReadonlyArray<ClickMode>} */
export const CLICK_MODES = Object.freeze([
	{ id: "off", label: "Off", hold: false, life: 0, force: () => {} },
	{ id: "scatter", label: "Scatter", hold: false, life: 0.3, force: scatter },
]);

// What `?hero-demo` opens with an empty or unknown value.
export const DEFAULT_MODE = "scatter";
