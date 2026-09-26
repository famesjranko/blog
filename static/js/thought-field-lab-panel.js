// On-phone tuning panel for the hero's snow globe, loaded only with
// ?tune: a "Tune" button opening a bottom sheet of controls over the lab
// store, so the hero stays in view above it.

import { KNOBS, TOGGLES } from "./thought-field-lab-knobs.js";
import { mountPermissionLab } from "./thought-field-lab-permission-ui.js";
import { mountPresets } from "./thought-field-lab-presets-ui.js";
import { createSlotStore } from "./thought-field-lab-slots.js";
import { createLabStore } from "./thought-field-lab-store.js";
import {
	DEFAULT_LAB,
	exportLab,
	resetEngine,
	resolvedKnobs,
	setEngine,
	setKnob,
	setStyle,
	setToggle,
} from "./thought-field-lab.js";
import {
	SHEET_STYLE,
	TUNE_STYLE,
	button,
	choice,
	el,
	heading,
	radios,
	rangeRow,
	textBox,
} from "./thought-field-lab-widgets.js";

/**
 * @typedef {import("./thought-field-lab-store.js").LabStore} LabStore
 * @typedef {import("./thought-field-lab.js").LabState} LabState
 * @typedef {import("./thought-field-lab-knobs.js").KnobGroup} KnobGroup
 * @typedef {import("./thought-field-lab-knobs.js").ToggleName} ToggleName
 * @typedef {import("./thought-field-engine.js").Settings} Settings
 * @typedef {{ settings: () => Settings, destroy: () => void }} LabPanel
 * @typedef {{
 *   motion: import("./thought-field-motion.js").MotionInput | null,
 *   hero: Element | null,
 * }} LabOptions
 * @typedef {{ store: LabStore, render: () => void, refresh: () => void }} Ctx
 */

/** @type {ReadonlyArray<readonly [string, string]>} */
const ENGINES = [
	["swirl", "A · Swirl"],
	["liquid", "B · Liquid"],
];
/** @type {ReadonlyArray<readonly [string, string]>} */
const STYLES = [
	["galaxy", "galaxy"],
	["pattern", "pattern"],
	["off", "off"],
];

/**
 * Applies CHANGE and rebuilds the sheet, for changes that alter which
 * controls it shows.
 * @param {Ctx} ctx
 * @param {(state: LabState) => LabState} change
 */
function applyAndRender(ctx, change) {
	ctx.store.update(change);
	ctx.render();
}

/**
 * A heading and the sliders of each group. A slider updates the store,
 * its own readout and the preset chips only, so the sheet is not rebuilt
 * under the finger; one held at 0 by a toggle is dimmed.
 * @param {Ctx} ctx
 * @param {string} title
 * @param {KnobGroup[]} groups
 * @returns {HTMLElement[]}
 */
function section(ctx, title, groups) {
	const state = ctx.store.state();
	const sliders = groups.flatMap((group) => {
		const resolved = resolvedKnobs(state, group);
		return Object.entries(state.knobs[group]).map(([key, value]) => {
			const knob = KNOBS[group][key];
			const spec = { label: key, knob, value, dim: resolved[key] !== value };
			return rangeRow(spec, (next) => {
				ctx.store.update((s) => setKnob(s, group, key, next));
				ctx.refresh();
			});
		});
	});
	return [heading(title), ...sliders];
}

/**
 * The ingredient toggles that act on the active engine.
 * @param {Ctx} ctx
 * @returns {HTMLDivElement}
 */
function toggles(ctx) {
	const state = ctx.store.state();
	/** @type {ToggleName[]} */
	const names =
		state.engine === "liquid"
			? ["lag", "tilt", "liquid", "bubble"]
			: ["lag", "tilt"];
	const row = el("div", "");
	const items = names.map((name) => {
		const label = TOGGLES[name].label;
		const checked = state.toggles[name];
		return choice({ type: "checkbox", name, label, checked }, (input) =>
			applyAndRender(ctx, (s) => setToggle(s, name, input.checked)),
		);
	});
	row.append(...items);
	return row;
}

/**
 * Prototype A's style picker and sliders: its globe and the active
 * style's.
 * @param {Ctx} ctx
 * @returns {HTMLElement[]}
 */
function swirlControls(ctx) {
	const { style } = ctx.store.state();
	const picker = radios("lab-style", STYLES, style, (value) =>
		applyAndRender(ctx, (s) =>
			setStyle(s, value === "pattern" || value === "off" ? value : "galaxy"),
		),
	);
	const flow = style === "off" ? [] : section(ctx, style, [style]);
	return [
		heading("A · Swirl"),
		picker,
		...section(ctx, "globe", ["swirl"]),
		...flow,
	];
}

/**
 * Engine picker, toggles, shared input and the active engine's controls.
 * @param {Ctx} ctx
 * @returns {HTMLElement[]}
 */
function controls(ctx) {
	const { engine } = ctx.store.state();
	const picker = radios("lab-engine", ENGINES, engine, (value) =>
		applyAndRender(ctx, (s) =>
			setEngine(s, value === "liquid" ? "liquid" : "swirl"),
		),
	);
	const active =
		engine === "liquid"
			? section(ctx, "B · Liquid", ["liquid"])
			: swirlControls(ctx);
	const input = section(ctx, "Shared input", ["slosh"]);
	return [picker, toggles(ctx), ...input, ...active];
}

/**
 * Reset and copy buttons, and where a failed copy shows its JSON.
 * @param {Ctx} ctx
 * @returns {HTMLDivElement}
 */
function actions(ctx) {
	const bar = el("div", "display: flex; flex-wrap: wrap; gap: 8px");
	const out = el("div", "margin-top: 8px");
	const copy = async () => {
		const json = exportLab(ctx.store.state());
		try {
			await navigator.clipboard.writeText(json);
			out.replaceChildren(el("div", "color: #8fdcaa", "Copied."));
		} catch {
			const box = textBox(json);
			out.replaceChildren(box);
			box.select();
		}
	};
	bar.append(
		button("Reset engine", () => applyAndRender(ctx, resetEngine)),
		button("Reset all", () => applyAndRender(ctx, () => DEFAULT_LAB)),
		button("Copy settings", () => void copy()),
	);
	const wrap = el("div", "margin-top: 16px");
	wrap.append(bar, out);
	return wrap;
}

/** @returns {Storage | null} */
function browserStorage() {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

/**
 * Mounts the Tune button and its sheet; the returned settings follow
 * every change from the next frame on. The header and presets stay put
 * while the controls below them are rebuilt.
 * @param {LabOptions} options
 * @returns {LabPanel}
 */
export function openLabPanel(options) {
	const { motion } = options;
	const store = createLabStore(browserStorage());
	const slots = createSlotStore(browserStorage());
	const permission = mountPermissionLab(options);
	const tune = el("button", TUNE_STYLE, "Tune");
	const sheet = el("div", `${SHEET_STYLE}; display: none`);
	/** @param {boolean} open */
	const setOpen = (open) => {
		sheet.style.display = open ? "block" : "none";
		tune.style.display = open ? "none" : "block";
	};
	tune.type = "button";
	tune.addEventListener("click", () => setOpen(true));
	const body = el("div", "");
	const render = () => {
		const ctx = { store, render, refresh: presets.refresh };
		body.replaceChildren(permission.section, ...controls(ctx), actions(ctx));
		presets.refresh();
	};
	/** @param {LabState} state */
	const load = (state) => {
		store.update(() => state);
		render();
	};
	const presets = mountPresets({ store, slots, load });
	const close = button("Close", () => setOpen(false), "float: right");
	const title = el("div", "font-weight: 600; line-height: 44px", "Hero lab");
	const off = "motion off: tune on a phone";
	const note = motion !== null ? [] : [el("div", "color: #ffb070", off)];
	sheet.append(close, title, ...note, presets.element, body);
	render();
	document.body.append(tune, sheet);
	return {
		settings: store.settings,
		destroy: () => {
			permission.destroy();
			tune.remove();
			sheet.remove();
		},
	};
}
