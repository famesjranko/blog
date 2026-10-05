// Feeds pointer presses on the open hero field to the orbit. The
// listeners are passive and never capture the pointer, so scrolling,
// links behave as before. A press on an interactive control starts
// nothing. Movement follows the pointer that began the hold.
// Pointercancel, lost buttons, or lost focus end a stale hold.

/** @typedef {import("./thought-field-orbit.js").Orbit} Orbit */

// Interactive controls: a press there belongs to the page, not the field.
const NOT_FIELD =
	"a, button, input, select, textarea, label, summary, [role], [contenteditable]";

/**
 * @param {Element} hero
 * @param {Orbit} orbit
 * @returns {() => void} removes the listeners
 */
export function listenForOrbit(hero, orbit) {
	const handlers = orbitInput(hero, orbit);
	const passive = { passive: true };
	hero.addEventListener("pointerdown", handlers.down, passive);
	window.addEventListener("pointermove", handlers.move, passive);
	window.addEventListener("pointerup", handlers.up, passive);
	window.addEventListener("pointercancel", handlers.up, passive);
	window.addEventListener("blur", handlers.end);
	return () => {
		hero.removeEventListener("pointerdown", handlers.down);
		window.removeEventListener("pointermove", handlers.move);
		window.removeEventListener("pointerup", handlers.up);
		window.removeEventListener("pointercancel", handlers.up);
		window.removeEventListener("blur", handlers.end);
	};
}

/**
 * Tracks the one pointer allowed to control the orbit.
 * @param {Element} hero
 * @param {Orbit} orbit
 */
function orbitInput(hero, orbit) {
	let activePointer = -1;
	const end = () => {
		if (activePointer !== -1) {
			orbit.release(activePointer);
			activePointer = -1;
		}
	};
	/** @param {Event} event */
	const down = (event) => {
		if (
			!(event instanceof PointerEvent) ||
			!fieldPress(event) ||
			activePointer !== -1
		) {
			return;
		}
		const point = fieldPoint(hero, event);
		if (point === null) {
			return;
		}
		activePointer = event.pointerId;
		orbit.press(point.x, point.y, event.pointerId);
	};
	/** @param {PointerEvent} event */
	const move = (event) => {
		if (event.pointerId !== activePointer) {
			return;
		}
		if ((event.buttons & 1) === 0) {
			end();
			return;
		}
		const point = fieldPoint(hero, event);
		if (point !== null) {
			orbit.move(point.x, point.y, event.pointerId);
		}
	};
	/** @param {PointerEvent} event */
	const up = (event) => {
		if (event.pointerId === activePointer) {
			end();
		}
	};
	return { down, move, up, end };
}

/**
 * Pointer position in the field's coordinates, or null for no field.
 * @param {Element} hero
 * @param {PointerEvent} event
 */
function fieldPoint(hero, event) {
	const rect = hero.getBoundingClientRect();
	if (!(rect.width > 0 && rect.height > 0)) {
		return null;
	}
	const px = (event.clientX - rect.left) / rect.width;
	const py = (event.clientY - rect.top) / rect.height;
	return { x: (px * 2 - 1) * (rect.width / rect.height), y: 1 - py * 2 };
}

/**
 * A primary press (left button, pen or first touch) on the open field.
 * @param {PointerEvent} event
 */
function fieldPress(event) {
	const { target } = event;
	const onPage =
		target instanceof Element && target.closest(NOT_FIELD) !== null;
	return event.button === 0 && event.isPrimary && !onPage;
}
