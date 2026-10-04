// Feeds pointer presses on the open hero field to the orbit. The
// listeners are passive and never capture the pointer, so scrolling,
// text selection and links behave as before. A press on the copy or a
// control starts nothing. Pointercancel ends a hold as pointerup does:
// a touch that turns into a scroll fades out.

/** @typedef {import("./thought-field-orbit.js").Orbit} Orbit */

// Text and controls: a press there belongs to the page, not the field.
const NOT_FIELD =
	"a, button, input, select, textarea, label, summary, [role], [contenteditable], h1, h2, h3, h4, h5, h6, p, li";

/**
 * @param {Element} hero
 * @param {Orbit} orbit
 * @returns {() => void} removes the listeners
 */
export function listenForOrbit(hero, orbit) {
	/** @param {Event} event */
	const down = (event) => {
		if (!(event instanceof PointerEvent) || !fieldPress(event)) {
			return;
		}
		const rect = hero.getBoundingClientRect();
		if (!(rect.width > 0 && rect.height > 0)) {
			return;
		}
		const px = (event.clientX - rect.left) / rect.width;
		const py = (event.clientY - rect.top) / rect.height;
		const aspect = rect.width / rect.height;
		orbit.press((px * 2 - 1) * aspect, 1 - py * 2, event.pointerId);
	};
	/** @param {PointerEvent} event */
	const up = (event) => orbit.release(event.pointerId);
	const passive = { passive: true };
	hero.addEventListener("pointerdown", down, passive);
	window.addEventListener("pointerup", up, passive);
	window.addEventListener("pointercancel", up, passive);
	return () => {
		hero.removeEventListener("pointerdown", down);
		window.removeEventListener("pointerup", up);
		window.removeEventListener("pointercancel", up);
	};
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
