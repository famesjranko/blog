// The click modes the hero demo switches between, in panel order. `off`
// is the hero with no click interaction, kept for comparison. Each life
// is the one its force module fades over, so a click is dropped just as
// its force reaches zero. Only Gather needs the press held.
import {
	attractForce,
	gatherForce,
	implodeForce,
	RADIAL_TUNING,
	shockwaveForce,
} from "./thought-field-click-radial.js";
import { SCATTER_LIFE, scatter } from "./thought-field-click-scatter.js";
import {
	SWIRL_TUNING,
	turbulenceForce,
	vortexForce,
} from "./thought-field-click-swirl.js";

/** @typedef {import("./thought-field-clicks.js").ClickMode} ClickMode */

/** @type {ReadonlyArray<ClickMode>} */
export const CLICK_MODES = Object.freeze([
	{ id: "off", label: "Off", hold: false, life: 0, force: () => {} },
	{
		id: "scatter",
		label: "Scatter",
		hold: false,
		life: SCATTER_LIFE,
		force: scatter,
	},
	{
		id: "shockwave",
		label: "Shockwave",
		hold: false,
		life: RADIAL_TUNING.shockwave.life,
		force: shockwaveForce,
	},
	{
		id: "implode",
		label: "Implode",
		hold: false,
		life: RADIAL_TUNING.implode.life,
		force: implodeForce,
	},
	{
		id: "attract",
		label: "Attract",
		hold: false,
		life: RADIAL_TUNING.attract.life,
		force: attractForce,
	},
	{
		id: "vortex",
		label: "Vortex",
		hold: false,
		life: SWIRL_TUNING.vortexLife,
		force: vortexForce,
	},
	{
		id: "gather",
		label: "Gather",
		hold: true,
		life: RADIAL_TUNING.gather.life,
		force: gatherForce,
	},
	{
		id: "turbulence",
		label: "Turbulence",
		hold: false,
		life: SWIRL_TUNING.turbulenceLife,
		force: turbulenceForce,
	},
]);

// What `?hero-demo` opens with an empty or unknown value.
export const DEFAULT_MODE = "scatter";
