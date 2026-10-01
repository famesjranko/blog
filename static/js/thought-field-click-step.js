import { effect as gather } from "./thought-field-click-gather.js";
import { effect as gravity } from "./thought-field-click-gravity.js";
import { effect as scatter } from "./thought-field-click-scatter.js";
import { effect as shockwave } from "./thought-field-click-shockwave.js";
import { effect as turbulence } from "./thought-field-click-turbulence.js";
import { effect as vortex } from "./thought-field-click-vortex.js";

/**
 * @typedef {import("./thought-field-particles.js").ClickEvent} ClickEvent
 */

const MAX_EVENTS = 3;

/**
 * @param {{ x: number, y: number, event: ClickEvent, dt: number, aspect: number }} options
 * @returns {{ x: number, y: number }}
 */
function displacement(options) {
	const { x, y, event, dt, aspect } = options;
	switch (event.mode) {
		case "shockwave":
			return shockwave({ x, y, event, dt, aspect });
		case "gravity-implosion":
		case "gravity-slow":
			return gravity({ x, y, event, dt, aspect });
		case "vortex-alternate":
		case "vortex-position":
			return vortex({ x, y, event, dt, aspect });
		case "scatter":
			return scatter({ x, y, event, dt, aspect });
		case "gather":
			return gather({ x, y, event, dt, aspect });
		case "turbulence":
			return turbulence({ x, y, event, dt, aspect });
		default:
			return { x: 0, y: 0 };
	}
}

/**
 * Adds bounded recent click displacements to one particle after its normal step.
 * @param {{ pos: Float32Array, ix: number, events: ReadonlyArray<ClickEvent>, dt: number, aspect: number }} options
 */
export function applyClickForces(options) {
	const { pos, ix, events, dt, aspect } = options;
	for (
		let i = Math.max(0, events.length - MAX_EVENTS);
		i < events.length;
		i += 1
	) {
		const event = events[i];
		if (event === undefined) {
			continue;
		}
		const offset = displacement({
			x: pos[ix],
			y: pos[ix + 1],
			event,
			dt,
			aspect,
		});
		pos[ix] += offset.x;
		pos[ix + 1] += offset.y;
	}
}
