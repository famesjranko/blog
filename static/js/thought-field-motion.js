/** @typedef {import("./thought-field-vec.js").Vec2} Vec2 */

/**
 * accelerationIncludingGravity in screen axes (m/s²).
 * @typedef {Vec2} MotionReading
 */

/** @typedef {{ x: number | null, y: number | null }} AccelerationReading */

/**
 * Latest reading, read once per frame by the loop.
 * @typedef {{
 *   reading: () => MotionReading | null,
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
	// Listening never prompts (only requestPermission() does, and only the ?tune lab calls it); unpermitted browsers send no or all-null events.
	return (
		env.matchMedia("(pointer: coarse)").matches && "DeviceMotionEvent" in env
	);
}

/**
 * Rotates a device-axes reading into screen axes. ANGLE is
 * screen.orientation.angle in degrees.
 * @param {Vec2} sample
 * @param {number} angle
 * @returns {Vec2}
 */
export function toScreenAxes(sample, angle) {
	const radians = (angle * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	return {
		x: sample.x * cos - sample.y * sin,
		y: sample.x * sin + sample.y * cos,
	};
}

/**
 * Converts one devicemotion event's fields into a screen-axes reading,
 * or null without an acceleration.
 * @param {AccelerationReading | null} accel
 * @param {number} angle
 * @returns {MotionReading | null}
 */
export function readingFrom(accel, angle) {
	if (accel === null || accel.x === null || accel.y === null) {
		return null;
	}
	return toScreenAxes({ x: accel.x, y: accel.y }, angle);
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
	/** @type {MotionReading | null} */
	let latest = null;
	/** @param {DeviceMotionEvent} event */
	const onMotion = (event) => {
		const next = readingFrom(
			event.accelerationIncludingGravity,
			screen.orientation.angle,
		);
		if (next !== null) {
			latest = next;
		}
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
