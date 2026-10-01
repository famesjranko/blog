/** @typedef {import("./thought-field-click-input.js").ClickMode} ClickMode */

const options = [
	["off", "Off"],
	["shockwave", "Shockwave"],
	["gravity-implosion", "Gravity well (short implosion)"],
	["gravity-slow", "Gravity well (slow pull)"],
	["vortex-alternate", "Vortex (alternating)"],
	["vortex-position", "Vortex (position)"],
	["scatter", "Particle scatter"],
	["gather", "Press → gather → release"],
	["turbulence", "Local turbulence"],
];

/** @returns {boolean} */
export function demoRequested() {
	return new URL(window.location.href).searchParams.get("heroDemo") === "1";
}

/**
 * @param {HTMLElement} hero
 * @returns {{ ready: (setMode: (mode: ClickMode) => void) => void,
 *   unavailable: () => void }}
 */
export function createHeroDemo(hero) {
	const markup = `<details class="hero-demo" data-click-selector>
<summary>Preview click interaction: <span data-demo-active>Off</span></summary>
<div class="hero-demo-body">
<label for="hero-demo-mode">Click or press effect</label>
<select id="hero-demo-mode">${options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select>
<p class="hero-demo-hint">Click or tap the field to try it. This choice is temporary.</p>
<p class="hero-demo-status" role="status" hidden></p>
</div></details>`;
	hero.insertAdjacentHTML("beforeend", markup);
	const select = hero.querySelector("#hero-demo-mode");
	const status = hero.querySelector(".hero-demo-status");
	const details = hero.querySelector(".hero-demo");
	const active = hero.querySelector("[data-demo-active]");
	if (
		!(select instanceof HTMLSelectElement) ||
		!(status instanceof HTMLElement) ||
		!(details instanceof HTMLDetailsElement) ||
		!(active instanceof HTMLElement)
	) {
		throw new Error("Hero demo controls could not be created");
	}
	/** @type {((mode: ClickMode) => void) | null} */
	let applyMode = null;
	select.addEventListener("change", () => {
		active.textContent =
			options.find(([value]) => value === select.value)?.[1] ?? "Off";
		applyMode?.(/** @type {ClickMode} */ (select.value));
	});
	return {
		ready: (setMode) => {
			applyMode = setMode;
			setMode(/** @type {ClickMode} */ (select.value));
		},
		unavailable: () => {
			select.disabled = true;
			status.hidden = false;
			status.textContent = "Particle field unavailable on this device.";
			details.open = true;
		},
	};
}
