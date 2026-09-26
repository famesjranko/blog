// The ?tune lab's motion-permission flow, to see and feel what asking
// would be like: an "Enable motion" pill in the hero as a first visitor
// would meet it, and a panel section with the live permission state,
// whether readings arrive, and buttons to ask or bring the pill back.
// Only the lab loads this; production listens and never asks.

import {
	motionRequester,
	pillMessage,
	pillVisible,
} from "./thought-field-lab-permission.js";
import { createPill } from "./thought-field-lab-pill.js";
import { button, el, heading } from "./thought-field-lab-widgets.js";
import { motionSupported } from "./thought-field-motion.js";

/**
 * @typedef {import("./thought-field-motion.js").MotionInput} MotionInput
 * @typedef {import("./thought-field-motion.js").MotionReading} MotionReading
 * @typedef {import("./thought-field-lab-permission.js").RequestPermission} RequestPermission
 * @typedef {{ query: (descriptor: { name: string }) => Promise<PermissionStatus> }} PermissionQuery
 * @typedef {{ section: HTMLElement, destroy: () => void }} PermissionLab
 * @typedef {{ supported: boolean, canRequest: boolean, startedAt: number }} PillGate
 */

/**
 * What the status line and pill show; the last three fields are the
 * pill's PillState.
 * @typedef {{
 *   permission: string,
 *   arriving: boolean,
 *   sawReading: boolean,
 *   asked: string,
 *   forced: boolean,
 *   dismissed: boolean,
 *   message: string | null,
 * }} PermissionView
 */

const STATUS_STYLE =
	"white-space: pre-line; margin: 4px 0 8px; font-variant-numeric: tabular-nums";
const HINT =
	"For a first-visit feel, set Brave → site settings → Motion sensors → Ask, then reload.";
const POLL_MS = 250;

/** @type {PermissionView} */
const INITIAL_VIEW = Object.freeze({
	permission: "checking",
	arriving: false,
	sawReading: false,
	asked: "not asked",
	forced: false,
	dismissed: false,
	message: null,
});

/** @type {Partial<PermissionView>} */
const HIDDEN = Object.freeze({ dismissed: true, forced: false, message: null });

/**
 * Calls REQUEST straight away, so it runs inside the tap's user gesture,
 * and settles to its result, "unavailable" or "error: <name>".
 * @param {RequestPermission | null} request
 * @returns {Promise<string>}
 */
async function askOutcome(request) {
	if (request === null) {
		return "unavailable";
	}
	try {
		return await request();
	} catch (error) {
		return `error: ${error instanceof Error ? error.name : String(error)}`;
	}
}

/**
 * Reports the Permissions API state for the accelerometer and every
 * change after, or "unsupported" where the browser has no such query or
 * throws on the name.
 * @param {AbortSignal} signal
 * @param {(state: string) => void} onState
 */
async function watchPermission(signal, onState) {
	if (!("permissions" in navigator)) {
		onState("unsupported");
		return;
	}
	// lib.dom's PermissionName leaves out "accelerometer".
	const permissions = /** @type {PermissionQuery} */ (navigator.permissions);
	try {
		const status = await permissions.query({ name: "accelerometer" });
		onState(status.state);
		const onChange = () => onState(status.state);
		status.addEventListener("change", onChange, { signal });
	} catch {
		onState("unsupported");
	}
}

/**
 * @param {PermissionView} view
 * @returns {string}
 */
function statusText(view) {
	return [
		`permission: ${view.permission}`,
		`readings arriving: ${view.arriving ? "yes" : "no"}`,
		`last request: ${view.asked}`,
	].join("\n");
}

/**
 * The panel's Permission section around STATUS.
 * @param {HTMLElement} status
 * @param {{ ask: () => void, showAgain: () => void }} actions
 * @returns {HTMLDivElement}
 */
function permissionSection(status, actions) {
	const bar = el("div", "display: flex; flex-wrap: wrap; gap: 8px");
	bar.append(
		button("Request permission", actions.ask),
		button("Show pill again", actions.showAgain),
	);
	const hint = el("div", "margin-top: 8px; opacity: 0.7", HINT);
	const wrap = el("div", "");
	wrap.append(heading("Permission"), status, bar, hint);
	return wrap;
}

/**
 * @param {PermissionView} view
 * @param {PillGate} gate
 * @returns {boolean}
 */
function pillShown(view, gate) {
	const { supported, canRequest, startedAt } = gate;
	const elapsedMs = performance.now() - startedAt;
	const { sawReading } = view;
	return pillVisible(view, { supported, canRequest, sawReading, elapsedMs });
}

/**
 * A poll that is true when a valid reading arrived since the last call:
 * motion.reading() hands back a new object for each valid devicemotion
 * event and keeps the last one through all-null events.
 * @param {MotionInput | null} motion
 * @returns {() => boolean}
 */
function readingWatch(motion) {
	/** @type {MotionReading | null} */
	let last = null;
	return () => {
		const reading = motion?.reading() ?? null;
		const fresh = reading !== null && reading !== last;
		last = reading;
		return fresh;
	};
}

/**
 * A browser that failed to start the sensor before a grant need not
 * retry for a listener it already has. This drops the page's only
 * devicemotion listener, so the sensor stops, and adds it back, so it
 * starts again under the new permission.
 * @param {MotionInput | null} motion
 */
function reattach(motion) {
	motion?.pause();
	motion?.resume();
}

/**
 * This browser's side of the pill's conditions, and its
 * requestPermission if it has one.
 * @returns {{ request: RequestPermission | null, gate: PillGate }}
 */
function browserGate() {
	const ctor = "DeviceMotionEvent" in window ? window.DeviceMotionEvent : null;
	const request = motionRequester(ctor);
	const supported = motionSupported(window);
	const startedAt = performance.now();
	return { request, gate: { supported, canRequest: !!request, startedAt } };
}

/**
 * Mounts the pill in the hero and returns the panel's Permission
 * section, both following one view of the permission state.
 * @param {{ motion: MotionInput | null, hero: Element | null }} options
 * @returns {PermissionLab}
 */
export function mountPermissionLab(options) {
	const { motion } = options;
	const controller = new AbortController();
	const { request, gate } = browserGate();
	const status = el("div", STATUS_STYLE);
	const fresh = readingWatch(motion);
	let view = INITIAL_VIEW;
	/** @param {boolean} fromPill */
	const ask = async (fromPill) => {
		const outcome = await askOutcome(request);
		const message = pillMessage(outcome);
		update({ asked: outcome });
		if (message === null) {
			reattach(motion);
			update(HIDDEN);
		} else if (fromPill) {
			update({ message });
			pill.fade(() => update(HIDDEN));
		}
	};
	const pill = createPill(options.hero, () => void ask(true));
	/** @param {Partial<PermissionView>} patch */
	const update = (patch) => {
		view = { ...view, ...patch };
		status.textContent = statusText(view);
		pill.paint(view.message, pillShown(view, gate));
	};
	const showAgain = () => {
		pill.stopFade();
		update({ forced: true, dismissed: false, message: null });
	};
	const poll = () => {
		const arriving = fresh();
		update({ arriving, sawReading: view.sawReading || arriving });
	};
	const timer = window.setInterval(poll, POLL_MS);
	void watchPermission(controller.signal, (permission) =>
		update({ permission }),
	);
	update({});
	return {
		section: permissionSection(status, {
			ask: () => void ask(false),
			showAgain,
		}),
		destroy: () => {
			controller.abort();
			window.clearInterval(timer);
			pill.remove();
		},
	};
}
