import { toScreenAxes } from "./thought-field-slosh.js";

/** @typedef {import("./thought-field-slosh.js").Vec2} Vec2 */

/**
 * Latest accelerationIncludingGravity in screen axes (m/s²), read once
 * per frame by the loop.
 * @typedef {{
 *   reading: () => Vec2 | null,
 *   pause: () => void,
 *   resume: () => void,
 *   destroy: () => void,
 * }} MotionInput
 */

/**
 * @param {{ matchMedia: (query: string) => { matches: boolean }, DeviceMotionEvent?: unknown }} env
 * @returns {boolean}
 */
export function motionSupported(env) {
	// Listening never prompts (only requestPermission() does, and we never call it); unpermitted browsers send no or all-null events.
	return (
		env.matchMedia("(pointer: coarse)").matches && "DeviceMotionEvent" in env
	);
}

/**
 * Phone motion for the hero field, or null where it is not offered.
 * Starts paused.
 * @returns {MotionInput | null}
 */
export function motionInput() {
	if (!motionSupported(window)) {
		return null;
	}
	/** @type {Vec2 | null} */
	let latest = null;
	/** @param {DeviceMotionEvent} event */
	const onMotion = (event) => {
		const sample = event.accelerationIncludingGravity;
		if (sample === null || sample.x === null || sample.y === null) {
			return;
		}
		latest = toScreenAxes(
			{ x: sample.x, y: sample.y },
			screen.orientation.angle,
		);
	};
	// addEventListener ignores a repeat of the same listener, so resume is idempotent.
	const resume = () =>
		window.addEventListener("devicemotion", onMotion, { passive: true });
	const pause = () => {
		window.removeEventListener("devicemotion", onMotion);
		latest = null;
	};
	return { reading: () => latest, pause, resume, destroy: pause };
}
