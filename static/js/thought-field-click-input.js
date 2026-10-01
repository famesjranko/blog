import { evolveVortices } from "./thought-field-click-vortex.js";

/**
 * @typedef {"off" | "shockwave" | "gravity-implosion" | "gravity-slow" |
 *   "vortex-alternate" | "vortex-position" | "scatter" | "gather" |
 *   "turbulence"} ClickMode
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: Exclude<ClickMode, "off" | "gather">, phase?: number,
 *   heldFor?: number, spin?: number }} PulseEvent
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: "gather", phase: "hold" | "release" | "cancel",
 *   heldFor?: number, spin?: number }} GatherEvent
 * @typedef {PulseEvent | GatherEvent} ClickEvent
 * @typedef {{ id: number, x: number, y: number, heldFor: number }} Held
 * @typedef {{ mode: ClickMode, events: ClickEvent[], held: Held | null,
 *   sequence: number, destroyed: boolean }} State
 */

const MAX_EVENTS = 3;
const LIFETIME = {
	shockwave: 2.6,
	"gravity-implosion": 0.65,
	"gravity-slow": 2.4,
	"vortex-alternate": 3,
	"vortex-position": 3,
	scatter: 0.16,
	gather: 0.5,
	turbulence: 1.4,
};
const PROTECTED =
	"a, button, input, select, textarea, label, summary, [role='button'], [role='link'], [role='combobox'], [role='radio'], [role='switch'], [data-click-selector], [data-click-mode]";

/** @param {EventTarget | null} target */
function isProtected(target) {
	return target instanceof Element && target.closest(PROTECTED) !== null;
}

/**
 * @param {Element} hero
 * @param {PointerEvent} event
 * @returns {{ x: number, y: number } | null}
 */
function position(hero, event) {
	const rect = hero.getBoundingClientRect();
	if (!(rect.width > 0 && rect.height > 0)) {
		return null;
	}
	const px = (event.clientX - rect.left) / rect.width;
	const py = (event.clientY - rect.top) / rect.height;
	if (!(px >= 0 && px <= 1 && py >= 0 && py <= 1)) {
		return null;
	}
	return { x: (px * 2 - 1) * (rect.width / rect.height), y: 1 - py * 2 };
}

/** @param {ClickEvent} event @returns {event is import("./thought-field-click-vortex.js").VortexEvent} */
function isVortex(event) {
	return event.mode === "vortex-alternate" || event.mode === "vortex-position";
}

/** @param {State} source @param {Element} hero @param {PointerEvent} event */
function onDown(source, hero, event) {
	const state = source;
	if (
		state.mode === "off" ||
		state.held !== null ||
		event.button !== 0 ||
		isProtected(event.target)
	) {
		return;
	}
	const point = position(hero, event);
	if (point === null) {
		return;
	}
	state.held = { id: event.pointerId, ...point, heldFor: 0 };
	if (state.mode === "gather") {
		/** @type {GatherEvent} */
		const gather = {
			...point,
			age: 0,
			strength: 1,
			mode: "gather",
			phase: "hold",
			heldFor: 0,
		};
		state.events = [...state.events, gather].slice(-MAX_EVENTS);
	}
}

/** @param {State} source @param {Element} hero @param {PointerEvent} event */
function onUp(source, hero, event) {
	const state = source;
	if (state.held === null || event.pointerId !== state.held.id) {
		return;
	}
	const current = state.held;
	state.held = null;
	const protectedTarget = isProtected(event.target);
	const point = protectedTarget ? null : position(hero, event);
	if (state.mode === "gather") {
		state.events = state.events.filter(
			(item) => item.mode !== "gather" || item.phase !== "hold",
		);
		if (protectedTarget) {
			return;
		}
		const releasePoint = point ?? { x: current.x, y: current.y };
		/** @type {GatherEvent} */
		const gather = {
			...releasePoint,
			age: 0,
			strength: 1,
			mode: "gather",
			phase: "release",
			heldFor: current.heldFor,
		};
		state.events = [...state.events, gather].slice(-MAX_EVENTS);
		return;
	}
	if (point !== null && state.mode !== "off") {
		state.events = [
			...state.events,
			{
				...point,
				age: 0,
				strength: 1,
				mode: state.mode,
				phase: state.sequence++,
			},
		].slice(-MAX_EVENTS);
	}
}

/** @param {State} source @param {PointerEvent} event */
function onCancel(source, event) {
	const state = source;
	if (state.held?.id !== event.pointerId) {
		return;
	}
	state.held = null;
	state.events = state.events.filter(
		(item) => item.mode !== "gather" || item.phase !== "hold",
	);
}

/** @param {ClickEvent} item @param {number} dt @param {Held | null} held @returns {ClickEvent} */
function ageEvent(item, dt, held) {
	if (item.mode === "gather" && item.phase === "hold") {
		return { ...item, heldFor: held?.heldFor ?? item.heldFor };
	}
	return isVortex(item) ? item : { ...item, age: item.age + dt };
}

/** @param {ClickEvent} item @returns {number} */
function lifetime(item) {
	return item.mode === "gather" && item.phase === "hold"
		? Infinity
		: LIFETIME[item.mode];
}

/** @param {State} source @param {number} dt @param {number} aspect @returns {ClickEvent[]} */
function step(source, dt, aspect) {
	const state = source;
	if (state.destroyed || !Number.isFinite(dt) || dt <= 0) {
		return state.events;
	}
	if (state.held !== null) {
		state.held = { ...state.held, heldFor: state.held.heldFor + dt };
	}
	const active = state.events
		.map((item) => ageEvent(item, dt, state.held))
		.filter(
			(item) => (isVortex(item) ? item.age + dt : item.age) < lifetime(item),
		);
	const vortices = evolveVortices(active.filter(isVortex), dt, aspect);
	let index = 0;
	state.events = active
		.map((item) => (isVortex(item) ? (vortices[index++] ?? item) : item))
		.filter((item) => item.age < lifetime(item))
		.slice(-MAX_EVENTS);
	return state.events;
}

/** @param {State} source @param {ClickMode} mode */
function setMode(source, mode) {
	const state = source;
	if (state.destroyed) {
		return;
	}
	if (
		![
			"off",
			"shockwave",
			"gravity-implosion",
			"gravity-slow",
			"vortex-alternate",
			"vortex-position",
			"scatter",
			"gather",
			"turbulence",
		].includes(mode)
	) {
		throw new RangeError(`Unknown click mode: ${mode}`);
	}
	state.mode = mode;
	state.events = [];
	state.held = null;
}

/**
 * Attach passive Pointer Events for mouse, pen, and touch.
 * @param {HTMLElement} hero
 * @param {{ aspect: number }} dims
 * @returns {{ step: (dt: number) => ClickEvent[], setMode: (mode: ClickMode) => void,
 *   destroy: () => void }}
 */
export function createClickInput(hero, dims) {
	/** @type {State} */
	const state = {
		mode: "off",
		events: [],
		held: null,
		sequence: 0,
		destroyed: false,
	};
	/** @param {PointerEvent} event */
	const down = (event) => onDown(state, hero, event);
	/** @param {PointerEvent} event */
	const up = (event) => onUp(state, hero, event);
	/** @param {PointerEvent} event */
	const cancel = (event) => onCancel(state, event);
	hero.addEventListener("pointerdown", down, { passive: true });
	window.addEventListener("pointerup", up, { passive: true });
	window.addEventListener("pointercancel", cancel, { passive: true });
	return {
		step: (dt) => step(state, dt, dims.aspect),
		setMode: (mode) => setMode(state, mode),
		destroy: () => {
			state.destroyed = true;
			state.events = [];
			state.held = null;
			hero.removeEventListener("pointerdown", down);
			window.removeEventListener("pointerup", up);
			window.removeEventListener("pointercancel", cancel);
		},
	};
}
