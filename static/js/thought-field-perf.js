// A/B measurement overlay for the hero field's physics cost, enabled by ?perf.

/** @typedef {{ particles: number, motion: boolean }} PerfLabel */

/**
 * @typedef {{
 *   begin: () => void,
 *   end: () => void,
 *   frame: (now: number) => void,
 *   destroy: () => void,
 * }} PerfMeter
 */

const SMOOTHING = 0.05;
const REFRESH_MS = 500;
// A longer gap is the loop pausing off-screen, not a slow frame.
const MAX_INTERVAL_MS = 250;

const OVERLAY_STYLE = [
	"position: fixed",
	"top: 0",
	"left: 0",
	"z-index: 2147483647",
	"pointer-events: none",
	"padding: 2px 6px",
	"font: 11px/1.4 monospace",
	"color: #fff",
	"background: rgba(0, 0, 0, 0.7)",
].join("; ");

/**
 * Exponential moving average seeded with its first sample.
 * @param {number | null} average
 * @param {number} sample
 * @returns {number}
 */
function smooth(average, sample) {
	return average === null ? sample : average + SMOOTHING * (sample - average);
}

/**
 * @param {{ sim: number | null, interval: number | null, label: PerfLabel }} stats
 * @returns {string}
 */
function summary({ sim, interval, label }) {
	const frame = interval ?? 0;
	const fps = frame > 0 ? Math.round(1000 / frame) : 0;
	const motion = label.motion ? "on" : "off";
	return [
		`sim ${(sim ?? 0).toFixed(2)} ms`,
		`frame ${frame.toFixed(1)} ms (${fps} fps)`,
		`${label.particles} particles`,
		`motion ${motion}`,
	].join(" · ");
}

/**
 * The overlay meter, or null unless the page URL has ?perf.
 * @param {PerfLabel} label
 * @returns {PerfMeter | null}
 */
export function perfMeter(label) {
	if (!new URLSearchParams(location.search).has("perf")) {
		return null;
	}
	/** @type {number | null} */
	let sim = null;
	/** @type {number | null} */
	let interval = null;
	/** @type {number | null} */
	let lastFrame = null;
	let started = 0;
	const overlay = document.createElement("div");
	overlay.setAttribute("style", OVERLAY_STYLE);
	document.body.append(overlay);
	const refresh = () => {
		overlay.textContent = summary({ sim, interval, label });
	};
	refresh();
	const timer = window.setInterval(refresh, REFRESH_MS);
	return {
		begin: () => {
			started = performance.now();
		},
		end: () => {
			sim = smooth(sim, performance.now() - started);
		},
		frame: (now) => {
			const gap = lastFrame === null ? null : now - lastFrame;
			lastFrame = now;
			if (gap !== null && gap <= MAX_INTERVAL_MS) {
				interval = smooth(interval, gap);
			}
		},
		destroy: () => {
			window.clearInterval(timer);
			overlay.remove();
		},
	};
}
