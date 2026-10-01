import { densityCount } from "./thought-field-maths.js";

/**
 * @typedef {import("./thought-field.js").Tier} Tier
 * @typedef {typeof import("./thought-field-click-demo.js")} DemoModule
 * @typedef {import("./thought-field-clicks.js").ClickSource} ClickSource
 */

// A navigation still pending after this long has most likely been
// stopped. One that commits later can show the white frame again.
const LEAVE_GRACE_MS = 5000;

const hero = document.querySelector("[data-hero]");
if (hero instanceof HTMLElement && "matchMedia" in window) {
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
	setupParallax(hero, reducedMotion || coarsePointer);
	// The click demo is opt-in; without the parameter none of its modules
	// is fetched and the field starts exactly as it always has.
	const demo = new URLSearchParams(location.search).has("hero-demo");
	if (reducedMotion) {
		fieldOff(hero, demo, "reduced motion is on");
	} else {
		scheduleField(hero, demo);
	}
}

/**
 * @param {HTMLElement} hero
 * @param {boolean} disabled
 */
function setupParallax(hero, disabled) {
	if (disabled) {
		return;
	}
	let scheduled = false;
	hero.addEventListener(
		"pointermove",
		(event) => {
			if (scheduled) {
				return;
			}
			scheduled = true;
			window.requestAnimationFrame(() => {
				scheduled = false;
				const rect = hero.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) {
					return;
				}
				const x = (event.clientX - rect.left) / rect.width - 0.5;
				const y = (event.clientY - rect.top) / rect.height - 0.5;
				hero.style.setProperty("--px", x.toFixed(3));
				hero.style.setProperty("--py", y.toFixed(3));
			});
		},
		{ passive: true },
	);
}

/**
 * Non-standard device hints. Absent on Firefox and Safari, so every
 * field is optional and the caller falls back to a generous default.
 * @typedef {Navigator & {
 *   connection?: { saveData?: boolean },
 *   deviceMemory?: number,
 * }} HintedNavigator
 */

/**
 * Tier before downloading anything: data-saver mode keeps the CSS
 * washes, phones get the desktop density over their smaller hero at a
 * sharp pixel ratio, weak laptops a mid field, desktops the full one.
 * Returning null means "skip WebGL entirely".
 * @param {HTMLElement} hero
 * @returns {Tier | null}
 */
function pickTier(hero) {
	const hinted = /** @type {HintedNavigator} */ (navigator);
	if (hinted.connection?.saveData === true) {
		return null;
	}
	const smallScreen = window.matchMedia("(max-width: 42rem)").matches;
	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
	if (smallScreen || coarsePointer) {
		const rect = hero.getBoundingClientRect();
		return { count: densityCount(rect.width, rect.height), pixelRatio: 2 };
	}
	const memory = hinted.deviceMemory ?? 8;
	const cores = navigator.hardwareConcurrency ?? 8;
	if (memory <= 4 || cores <= 4) {
		return { count: 750, pixelRatio: 1.5 };
	}
	return { count: 1600, pixelRatio: 2 };
}

function webglAvailable() {
	if (!("WebGL2RenderingContext" in window)) {
		return false;
	}
	const probe = document.createElement("canvas").getContext("webgl2");
	return probe !== null;
}

/**
 * @param {HTMLElement} hero
 * @param {boolean} demo whether the page asked for the click demo
 */
function scheduleField(hero, demo) {
	const canvas = hero.querySelector("[data-thought-field]");
	if (!(canvas instanceof HTMLCanvasElement)) {
		return;
	}
	const tier = pickTier(hero);
	if (tier === null) {
		fieldOff(hero, demo, "data saver is on");
		return;
	}
	if (!webglAvailable()) {
		fieldOff(hero, demo, "WebGL 2 is not available");
		return;
	}
	const start = () => {
		void startField({ hero, canvas, tier, demo });
	};
	if (!("IntersectionObserver" in window) || heroAlreadyVisible(hero)) {
		idle(start);
		return;
	}
	const seen = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			seen.disconnect();
			idle(start);
		}
	});
	seen.observe(hero);
}

/** @param {HTMLElement} hero */
function heroAlreadyVisible(hero) {
	const rect = hero.getBoundingClientRect();
	return rect.top < window.innerHeight && rect.bottom > 0;
}

/** @param {() => void} callback */
function idle(callback) {
	if (typeof window.requestIdleCallback === "function") {
		window.requestIdleCallback(() => callback(), { timeout: 2500 });
	} else {
		window.setTimeout(callback, 1200);
	}
}

/**
 * @param {{
 *   hero: HTMLElement,
 *   canvas: HTMLCanvasElement,
 *   tier: Tier,
 *   demo: boolean,
 * }} options
 */
async function startField(options) {
	const { hero, canvas, tier, demo } = options;
	/** @type {ClickSource | null} */
	let clicks = null;
	try {
		const sibling = new URL("./thought-field.js", import.meta.url);
		/** @type {typeof import("./thought-field.js")} */
		const field = await import(sibling.href);
		// A demo that cannot load leaves the field running as normal.
		clicks = demo
			? await loadDemo()
					.then((module) => module.startDemo(hero))
					.catch(() => null)
			: null;
		field.initThoughtField(canvas, tier, clicks);
		hideFieldOnLeave(canvas);
	} catch {
		// The CSS wash fallback stands alone; drop the empty canvas. A
		// panel the demo already mounted stays the only one.
		canvas.remove();
		fieldOff(hero, demo && clicks === null, "the field failed to load");
	}
}

/** @returns {Promise<DemoModule>} */
async function loadDemo() {
	const url = new URL("./thought-field-click-demo.js", import.meta.url);
	return import(url.href);
}

/**
 * When the page asked for the click demo but the field cannot run, the
 * panel still mounts and says why. The demo never overrides the reason.
 * @param {HTMLElement} hero
 * @param {boolean} demo
 * @param {string} reason
 */
function fieldOff(hero, demo, reason) {
	if (!demo) {
		return;
	}
	loadDemo().then(
		(module) => module.showFieldOff(hero, reason),
		() => {
			// Without the demo module there is no panel to show.
		},
	);
}

/**
 * Chromium can draw the outgoing page once more after its WebGL
 * texture is freed, and paints the missing canvas opaque white: a
 * one-frame white hero on refresh or navigation. Hiding the canvas
 * when navigation starts puts a frame without it on screen first;
 * `pagehide` fires too late for that. Firefox has no such bug but
 * keeps pages with a `beforeunload` listener out of its back/forward
 * cache, so only Chromium (the engine with userAgentData) listens.
 * A page restored from that cache shows the field again.
 *
 * A navigation can also start and then not replace the page: the
 * user stops it, or the response is a 204, a download, or a
 * `mailto:`. No event reports that, so a timer shows the field again
 * after LEAVE_GRACE_MS. A real unload discards the timer first.
 * @param {HTMLCanvasElement} canvas
 */
export function hideFieldOnLeave(canvas) {
	if (!("userAgentData" in navigator)) {
		return;
	}
	const show = () => canvas.style.removeProperty("visibility");
	let restore = 0;
	window.addEventListener("beforeunload", () => {
		canvas.style.setProperty("visibility", "hidden");
		window.clearTimeout(restore);
		restore = window.setTimeout(show, LEAVE_GRACE_MS);
	});
	window.addEventListener("pageshow", show);
}
