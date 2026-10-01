// The click demo's switcher: a fixed bar at the foot of the viewport
// with previous and next buttons around a native select. On a phone the
// select opens the system picker, so one tap lists every mode. Desktop
// also takes the keys 1-9, [ and ] (keyPick).

/**
 * @typedef {import("./thought-field-clicks.js").ClickMode} ClickMode
 * @typedef {{
 *   modes: ReadonlyArray<ClickMode>,
 *   reason: string,
 *   label: (id: string) => string,
 *   pick: (from: string, step: number) => void,
 * }} PanelOptions
 */

/**
 * @param {string} text
 * @param {string} name
 * @param {() => void} onPress
 * @returns {HTMLButtonElement}
 */
function stepButton(text, name, onPress) {
	const button = document.createElement("button");
	button.type = "button";
	button.className = "click-panel-step";
	button.textContent = text;
	button.setAttribute("aria-label", name);
	button.addEventListener("click", onPress);
	return button;
}

/**
 * @param {PanelOptions} options
 * @returns {HTMLSelectElement}
 */
function modeSelect(options) {
	const { modes, label, pick } = options;
	const select = document.createElement("select");
	select.className = "click-panel-select";
	select.setAttribute("aria-label", "Click mode");
	for (const mode of modes) {
		const option = document.createElement("option");
		option.value = mode.id;
		option.textContent = label(mode.id);
		select.append(option);
	}
	select.addEventListener("change", () => pick(select.value, 0));
	return select;
}

/**
 * What the live note says for MODE.
 * @param {ClickMode | undefined} mode
 * @returns {string}
 */
function hint(mode) {
	if (mode === undefined || mode.id === "off") {
		return "Off: the hero has no click effect.";
	}
	const hold = mode.hold ? ` Hold for ${mode.label}.` : "";
	return `${mode.label}: tap or click the field.${hold}`;
}

/**
 * What KEY asks for: 1-9 a mode by place, [ and ] a step back or
 * forward from CURRENT. Any other key asks for nothing.
 * @param {string} key
 * @param {ReadonlyArray<ClickMode>} modes
 * @param {string} current
 * @returns {{ from: string, step: number } | null}
 */
export function keyPick(key, modes, current) {
	if (key === "[" || key === "]") {
		return { from: current, step: key === "[" ? -1 : 1 };
	}
	const place = /^[1-9]$/.test(key) ? modes[Number(key) - 1] : undefined;
	return place === undefined ? null : { from: place.id, step: 0 };
}

/**
 * Typing in a form control and shortcuts with modifiers pass through.
 * @param {PanelOptions} options
 * @param {() => string} current
 * @returns {(event: KeyboardEvent) => void}
 */
function keyHandler(options, current) {
	const { modes, pick } = options;
	return (event) => {
		const target = event.target;
		const typing =
			target instanceof HTMLElement &&
			target.closest("input, select, textarea, [contenteditable]") !== null;
		if (typing || event.ctrlKey || event.metaKey || event.altKey) {
			return;
		}
		const asked = keyPick(event.key, modes, current());
		if (asked !== null) {
			pick(asked.from, asked.step);
		}
	};
}

/**
 * Appends the panel to the page. `show` marks ID as the active mode.
 * A non-empty REASON says why the field is off.
 * @param {PanelOptions} options
 * @returns {{ show: (id: string) => void }}
 */
export function mountPanel(options) {
	const { modes, reason, pick } = options;
	let current = modes[0]?.id ?? "";
	const bar = document.createElement("div");
	bar.className = "click-panel";
	bar.setAttribute("data-click-panel", "");
	bar.setAttribute("role", "group");
	bar.setAttribute("aria-label", "Hero click demo");
	const select = modeSelect(options);
	const note = document.createElement("p");
	note.className = "click-panel-note";
	note.setAttribute("aria-live", "polite");
	bar.append(
		stepButton("‹", "Previous click mode", () => pick(current, -1)),
		select,
		stepButton("›", "Next click mode", () => pick(current, 1)),
		note,
	);
	if (reason !== "") {
		const off = document.createElement("p");
		off.className = "click-panel-note";
		off.textContent = `The field is off: ${reason}.`;
		bar.append(off);
	}
	document.body.append(bar);
	document.addEventListener(
		"keydown",
		keyHandler(options, () => current),
	);
	return {
		show: (id) => {
			current = id;
			select.value = id;
			note.textContent = hint(modes.find((mode) => mode.id === id));
		},
	};
}
