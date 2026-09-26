// Form widgets for the ?tune lab panel: phone-sized buttons, radios,
// checkboxes and labelled sliders, dark and inline-styled because the
// lab is a throwaway debug tool.

/** @typedef {import("./thought-field-lab-knobs.js").Knob} Knob */

const Z = "z-index: 2147483646";
const FONT = "font: 14px/1.4 system-ui, sans-serif";
const INK = "color: #e8eef4";
const BUTTON = `min-height: 44px; padding: 0 16px; ${FONT}; color: #fff; background: #26313d; border: 1px solid #4a5a6a; border-radius: 10px`;
export const TUNE_STYLE = `position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); ${Z}; ${BUTTON}; background: #1f6f5c`;
export const SHEET_STYLE = `position: fixed; left: 0; right: 0; bottom: 0; ${Z}; max-height: 55vh; overflow-y: auto; overscroll-behavior: contain; touch-action: pan-y; box-sizing: border-box; padding: 8px 14px calc(16px + env(safe-area-inset-bottom)); ${FONT}; ${INK}; background: rgba(12, 16, 22, 0.96); border-top: 1px solid #334; border-radius: 14px 14px 0 0`;
const HEADING =
	"margin: 14px 0 2px; font-size: 13px; font-weight: 600; color: #8fc7ff; text-transform: uppercase; letter-spacing: 0.04em";
const CHOICE =
	"display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-right: 18px";
const TICK = "width: 22px; height: 22px; margin: 0; accent-color: #5fb8ff";
const RANGE =
	"display: block; width: 100%; height: 32px; margin: 0; accent-color: #5fb8ff";
const CHIP = `${BUTTON}; flex: none; padding: 0 14px; border-radius: 22px; white-space: nowrap`;
export const CHIP_ROW =
	"display: flex; gap: 8px; overflow-x: auto; overscroll-behavior-x: contain; padding: 4px 0";
const JSON_BOX = `display: block; box-sizing: border-box; width: 100%; height: 40vh; font: 12px/1.3 monospace; ${INK}; background: #0a0d12`;

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {string} style
 * @param {string} [text]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, style, text = "") {
	const node = document.createElement(tag);
	node.setAttribute("style", style);
	node.textContent = text;
	return node;
}

/**
 * @param {string} text
 * @returns {HTMLDivElement}
 */
export function heading(text) {
	return el("div", HEADING, text);
}

/**
 * @param {string} text
 * @param {() => void} onClick
 * @param {string} [style] extra declarations
 * @returns {HTMLButtonElement}
 */
export function button(text, onClick, style = "") {
	const node = el("button", `${BUTTON}; ${style}`, text);
	node.type = "button";
	node.addEventListener("click", onClick);
	return node;
}

/**
 * A rounded chip's style: highlighted while ACTIVE, faded while EMPTY.
 * @param {boolean} active
 * @param {boolean} empty
 * @returns {string}
 */
export function chipStyle(active, empty) {
	const fill = active ? "background: #1f6f5c; border-color: #5fb8ff" : "";
	return `${CHIP}; ${fill}; opacity: ${empty ? 0.55 : 1}`;
}

/**
 * A labelled radio or checkbox 44px tall.
 * @param {{ type: string, name: string, label: string, checked: boolean }} spec
 * @param {(input: HTMLInputElement) => void} onChange
 * @returns {HTMLLabelElement}
 */
export function choice(spec, onChange) {
	const label = el("label", CHOICE);
	const input = el("input", TICK);
	input.type = spec.type;
	input.name = spec.name;
	input.checked = spec.checked;
	input.addEventListener("change", () => onChange(input));
	label.append(input, spec.label);
	return label;
}

/**
 * @param {string} name
 * @param {ReadonlyArray<readonly [string, string]>} options value, label
 * @param {string} current
 * @param {(value: string) => void} pick
 * @returns {HTMLDivElement}
 */
export function radios(name, options, current, pick) {
	const row = el("div", "");
	const items = options.map(([value, label]) =>
		choice({ type: "radio", name, label, checked: value === current }, () =>
			pick(value),
		),
	);
	row.append(...items);
	return row;
}

/**
 * Decimal places that show one STEP.
 * @param {number} step
 * @returns {number}
 */
function places(step) {
	return (String(step).split(".")[1] ?? "").length;
}

/**
 * A slider with its label and live value above it. Dimmed when `dim`.
 * @param {{ label: string, knob: Knob, value: number, dim: boolean }} spec
 * @param {(value: number) => void} onInput
 * @returns {HTMLLabelElement}
 */
export function rangeRow(spec, onInput) {
	const [min, max, step, unit] = spec.knob;
	const row = el(
		"label",
		`display: block; margin: 6px 0; opacity: ${spec.dim ? 0.4 : 1}`,
	);
	const head = el("div", "display: flex; justify-content: space-between");
	const shown = el("span", "font-variant-numeric: tabular-nums");
	/** @param {number} value */
	const show = (value) => {
		shown.textContent = `${value.toFixed(places(step))} ${unit}`;
	};
	show(spec.value);
	head.append(el("span", "", spec.label), shown);
	const input = el("input", RANGE);
	input.type = "range";
	input.min = String(min);
	input.max = String(max);
	input.step = String(step);
	input.value = String(spec.value);
	input.addEventListener("input", () => {
		const value = Number(input.value);
		show(value);
		onInput(value);
	});
	row.append(head, input);
	return row;
}

/**
 * A read-only text box, for copying by hand.
 * @param {string} text
 * @returns {HTMLTextAreaElement}
 */
export function textBox(text) {
	const area = el("textarea", JSON_BOX, text);
	area.readOnly = true;
	return area;
}
