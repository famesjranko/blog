// The ?tune lab's "Enable motion" pill: a quiet button in the hero, as
// a first visitor would meet it if the site asked for motion. Styled
// from the site's colour tokens; the hero forces a dark scheme, so they
// resolve to their dark values.

import { el } from "./thought-field-lab-widgets.js";

/**
 * @typedef {{
 *   paint: (message: string | null, shown: boolean) => void,
 *   fade: (done: () => void) => void,
 *   stopFade: () => void,
 *   remove: () => void,
 * }} Pill
 */

const PILL_STYLE = [
	"position: absolute",
	"left: 50%",
	"bottom: calc(24px + env(safe-area-inset-bottom))",
	"translate: -50% 0",
	"z-index: 2",
	"min-height: 44px",
	"padding: 0 20px",
	"border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent)",
	"border-radius: 999px",
	"background: color-mix(in srgb, var(--color-bg) 55%, transparent)",
	"-webkit-backdrop-filter: blur(8px)",
	"backdrop-filter: blur(8px)",
	"font: 500 0.9rem/1.2 var(--font-ui)",
	"letter-spacing: 0.02em",
	"white-space: nowrap",
	"transition: opacity 0.6s ease",
].join("; ");
const LABEL = "Enable motion";
const FADE_AFTER_MS = 2200;
const FADE_MS = 600;

/**
 * Mounts the pill, hidden, in HERO. paint() shows a message (muted, not
 * tappable) or the label; fade() dims a message out, then calls DONE.
 * @param {Element | null} hero
 * @param {() => void} onTap
 * @returns {Pill}
 */
export function createPill(hero, onTap) {
	const pill = el("button", `${PILL_STYLE}; display: none`, LABEL);
	let fade = 0;
	const stopFade = () => {
		window.clearTimeout(fade);
		pill.style.opacity = "1";
	};
	pill.type = "button";
	pill.addEventListener("click", onTap);
	hero?.append(pill);
	return {
		paint: (message, shown) => {
			const ink = message === null ? "--color-text" : "--color-muted";
			pill.textContent = message ?? LABEL;
			pill.disabled = message !== null;
			pill.style.color = `var(${ink})`;
			pill.style.display = shown ? "block" : "none";
		},
		fade: (done) => {
			fade = window.setTimeout(() => {
				pill.style.opacity = "0";
				fade = window.setTimeout(() => {
					stopFade();
					done();
				}, FADE_MS);
			}, FADE_AFTER_MS);
		},
		stopFade,
		remove: () => {
			stopFade();
			pill.remove();
		},
	};
}
