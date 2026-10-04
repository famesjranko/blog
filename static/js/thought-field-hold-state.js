/**
 * @typedef {"hold-pull" | "hold-push" | "hold-orbit"} HoldMode
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: HoldMode, phase: "hold" | "release", heldFor: number }} HoldEvent
 * @typedef {{ x: number, y: number, age: number, strength: number,
 *   mode: "gather", phase: "hold" | "release" | "cancel",
 *   heldFor?: number, spin?: number }} GatherEvent
 */

export const HOLD_TAIL = 0.25;

/** @param {string} mode @returns {mode is HoldMode} */
export function isHoldMode(mode) {
	return mode === "hold-pull" || mode === "hold-push" || mode === "hold-orbit";
}

/** @param {{ mode: string }} event @returns {event is HoldEvent} */
export function isHoldEvent(event) {
	return isHoldMode(event.mode);
}

/** @param {HoldMode} mode @param {{ x: number, y: number }} point @returns {HoldEvent} */
export function startHold(mode, point) {
	return { ...point, mode, age: 0, strength: 1, phase: "hold", heldFor: 0 };
}

/** @param {HoldEvent} event @param {number} heldFor @returns {HoldEvent} */
export function releaseHold(event, heldFor) {
	return { ...event, age: 0, phase: "release", heldFor };
}

/** @param {HoldEvent} event @param {number} dt @param {number} heldFor @returns {HoldEvent} */
export function advanceHold(event, dt, heldFor) {
	return event.phase === "hold"
		? { ...event, heldFor }
		: { ...event, age: event.age + dt };
}

/** @param {HoldEvent[]} events @param {number} heldFor @param {boolean} protectedTarget @returns {HoldEvent[]} */
export function finishHold(events, heldFor, protectedTarget) {
	const active = events.find((event) => event.phase === "hold");
	if (active === undefined || protectedTarget) {
		return [];
	}
	return [releaseHold(active, heldFor)];
}

/** @param {{ x: number, y: number }} point @returns {GatherEvent} */
export function startGather(point) {
	return {
		...point,
		age: 0,
		strength: 1,
		mode: "gather",
		phase: "hold",
		heldFor: 0,
	};
}

/** @param {{ x: number, y: number }} point @param {number} heldFor @returns {GatherEvent} */
export function finishGather(point, heldFor) {
	return {
		...point,
		age: 0,
		strength: 1,
		mode: "gather",
		phase: "release",
		heldFor,
	};
}
