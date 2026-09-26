// Decisions behind the ?tune lab's motion-permission flow: when the
// "Enable motion" pill shows, how to reach DeviceMotionEvent's
// requestPermission, and what the pill says after asking. No DOM, so
// Node can test it. Production never asks; only the lab loads this.

/**
 * How long the field runs without a valid reading before the pill offers
 * to ask (ms).
 */
export const PILL_DELAY_MS = 1500;

/** @typedef {"granted" | "denied"} PermissionResult */
/** @typedef {() => Promise<PermissionResult>} RequestPermission */

/**
 * @typedef {{
 *   supported: boolean,
 *   canRequest: boolean,
 *   sawReading: boolean,
 *   elapsedMs: number,
 * }} PillInputs
 */

/**
 * True when a visitor would be offered the pill: motion is supported,
 * the browser can ask, and no valid reading has arrived in the first
 * PILL_DELAY_MS.
 * @param {PillInputs} inputs
 * @returns {boolean}
 */
export function shouldShowPill(inputs) {
	return (
		inputs.supported &&
		inputs.canRequest &&
		!inputs.sawReading &&
		inputs.elapsedMs >= PILL_DELAY_MS
	);
}

/**
 * The pill's own state: `forced` by "Show pill again", `message` after a
 * refusal until it fades, `dismissed` once answered.
 * @typedef {{ forced: boolean, dismissed: boolean, message: string | null }} PillState
 */

/**
 * Whether the pill is up. Dismissed hides it; forced or showing a
 * message keeps it up; otherwise the visitor conditions decide.
 * @param {PillState} pill
 * @param {PillInputs} inputs
 * @returns {boolean}
 */
export function pillVisible(pill, inputs) {
	if (pill.dismissed) {
		return false;
	}
	return pill.forced || pill.message !== null || shouldShowPill(inputs);
}

/**
 * DeviceMotionEvent.requestPermission bound to its constructor, or null
 * where the browser has none. lib.dom does not declare it, so the
 * constructor is read through a narrow view.
 * @param {unknown} ctor the page's DeviceMotionEvent, if any
 * @returns {RequestPermission | null}
 */
export function motionRequester(ctor) {
	if (ctor === null || ctor === undefined) {
		return null;
	}
	const view = /** @type {{ requestPermission?: RequestPermission }} */ (ctor);
	const request = view.requestPermission;
	if (typeof request !== "function") {
		return null;
	}
	return () => request.call(view);
}

/**
 * The line the pill shows after asking, or null when it should go.
 * OUTCOME is the request's result, "unavailable", or "error: <name>".
 * @param {string} outcome
 * @returns {string | null}
 */
export function pillMessage(outcome) {
	if (outcome === "granted") {
		return null;
	}
	if (outcome === "unavailable") {
		return "Motion not available here";
	}
	return "Motion blocked in site settings";
}
