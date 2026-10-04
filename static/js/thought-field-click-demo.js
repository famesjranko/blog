// The opt-in click demo on the real hero. hero.js fetches this module
// only when the page URL has `hero-demo`, so the normal hero never loads
// it. It turns presses on the hero into live clicks in field space and
// mounts the switcher panel.
import { CLICK_MODES, DEFAULT_MODE } from "./thought-field-click-modes.js";
import { mountPanel } from "./thought-field-click-panel.js";
import { createClicks } from "./thought-field-clicks.js";

/**
 * @typedef {import("./thought-field-clicks.js").ClickMode} ClickMode
 * @typedef {import("./thought-field-clicks.js").ClickField} ClickField
 * @typedef {import("./thought-field-clicks.js").ClickSource} ClickSource
 * @typedef {{ left: number, top: number, width: number, height: number }} Box
 * @typedef {EventTarget & {
 *   getBoundingClientRect(): Box,
 *   setPointerCapture(pointerId: number): void,
 * }} PressTarget
 */

export const DEMO_PARAM = "hero-demo";
// Presses on these never make a click.
const IGNORED = "a, button, select, [data-click-panel]";

/**
 * The mode id `?hero-demo=<id>` asks for; an empty or unknown value
 * gives DEFAULT_MODE.
 * @param {string} search
 * @param {ReadonlyArray<ClickMode>} modes
 * @returns {string}
 */
export function parseDemo(search, modes) {
	const asked = new URLSearchParams(search).get(DEMO_PARAM) ?? "";
	return modes.some((mode) => mode.id === asked) ? asked : DEFAULT_MODE;
}

/**
 * The mode STEP places after ID, wrapping at either end.
 * @param {ReadonlyArray<ClickMode>} modes
 * @param {string} id
 * @param {number} step
 * @returns {string}
 */
export function nextMode(modes, id, step) {
	const at = Math.max(
		0,
		modes.findIndex((mode) => mode.id === id),
	);
	const index = (((at + step) % modes.length) + modes.length) % modes.length;
	return modes[index]?.id ?? DEFAULT_MODE;
}

/**
 * HREF with `hero-demo` set to ID and every other part kept.
 * @param {string} href
 * @param {string} id
 * @returns {string}
 */
export function demoUrl(href, id) {
	const url = new URL(href);
	url.searchParams.set(DEMO_PARAM, id);
	return url.href;
}

/**
 * The panel's name for ID: its place in the list, then its label.
 * @param {ReadonlyArray<ClickMode>} modes
 * @param {string} id
 * @returns {string}
 */
export function modeLabel(modes, id) {
	const index = modes.findIndex((mode) => mode.id === id);
	const label = modes[index]?.label ?? id;
	return `${index + 1}/${modes.length}  ${label}`;
}

/**
 * Client coordinates to field space, as thought-field.js maps the
 * pointer: x in [-aspect, aspect], y in [-1, 1] with y up.
 * @param {Box} box
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{ x: number, y: number } | null}
 */
export function fieldPoint(box, clientX, clientY) {
	if (box.width === 0 || box.height === 0) {
		return null;
	}
	const nx = ((clientX - box.left) / box.width) * 2 - 1;
	const ny = ((clientY - box.top) / box.height) * 2 - 1;
	return { x: nx * (box.width / box.height), y: -ny };
}

/** @param {EventTarget | null} target */
function ignored(target) {
	return (
		typeof Element !== "undefined" &&
		target instanceof Element &&
		target.closest(IGNORED) !== null
	);
}

/**
 * Turns primary presses on HERO into clicks. A release or a cancel (a
 * scroll the browser took over) releases the press of that pointer.
 * The hero captures the pointer, so a mouse released off the hero still
 * releases the press instead of leaving it held until HOLD_LIMIT.
 * @param {PressTarget} hero
 * @param {ClickField} clicks
 */
export function listenForPresses(hero, clicks) {
	/** @type {Map<number, number>} */
	const held = new Map();
	/** @param {PointerEvent} event */
	const onDown = (event) => {
		if (event.button !== 0 || ignored(event.target)) {
			return;
		}
		const point = fieldPoint(
			hero.getBoundingClientRect(),
			event.clientX,
			event.clientY,
		);
		if (point !== null) {
			hero.setPointerCapture(event.pointerId);
			held.set(event.pointerId, clicks.press(point.x, point.y));
		}
	};
	/** @param {PointerEvent} event */
	const onUp = (event) => {
		const serial = held.get(event.pointerId);
		if (serial !== undefined) {
			held.delete(event.pointerId);
			clicks.release(serial);
		}
	};
	hero.addEventListener("pointerdown", /** @type {EventListener} */ (onDown));
	hero.addEventListener("pointerup", /** @type {EventListener} */ (onUp));
	hero.addEventListener("pointercancel", /** @type {EventListener} */ (onUp));
}

/**
 * Mounts the panel on a hero whose field could not start, with REASON.
 * Switching still updates the URL, so the link can be shared.
 * @param {HTMLElement} hero
 * @param {string} reason
 */
export function showFieldOff(hero, reason) {
	mountDemo(hero, null, reason);
}

/**
 * Starts the click demo on HERO and returns the source the frame loop
 * steps after the particles.
 * @param {HTMLElement} hero
 * @returns {ClickSource}
 */
export function startDemo(hero) {
	// mountDemo switches to the mode the URL asks for.
	const clicks = createClicks(modeById(DEFAULT_MODE));
	mountDemo(hero, clicks, "");
	listenForPresses(hero, clicks);
	return { step: clicks.step, hover: clicks.hover };
}

/**
 * @param {string} id
 * @returns {ClickMode}
 */
function modeById(id) {
	const mode = CLICK_MODES.find((entry) => entry.id === id);
	if (mode === undefined) {
		throw new Error(`unknown click mode: ${id}`);
	}
	return mode;
}

/**
 * @param {HTMLElement} hero
 * @param {ClickField | null} clicks
 * @param {string} reason
 */
function mountDemo(hero, clicks, reason) {
	const first = parseDemo(location.search, CLICK_MODES);
	hero.setAttribute("data-click-demo", "");
	/** @param {string} id */
	const choose = (id) => {
		clicks?.setMode(modeById(id));
		hero.setAttribute("data-click-mode", id);
		history.replaceState(history.state, "", demoUrl(location.href, id));
		panel.show(id);
	};
	const panel = mountPanel({
		modes: CLICK_MODES,
		reason,
		label: (id) => modeLabel(CLICK_MODES, id),
		pick: (from, step) => choose(nextMode(CLICK_MODES, from, step)),
	});
	choose(first);
}
