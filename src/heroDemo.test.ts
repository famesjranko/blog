import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mode =
	| "off"
	| "shockwave"
	| "gravity-implosion"
	| "gravity-slow"
	| "vortex-alternate"
	| "vortex-position"
	| "scatter"
	| "gather"
	| "turbulence";
type Demo = {
	ready: (setMode: (mode: Mode) => void) => void;
	unavailable: () => void;
};
const { createHeroDemo, demoRequested } = await vi.importActual<{
	createHeroDemo: (hero: Hero) => Demo;
	demoRequested: () => boolean;
}>("../static/js/hero-demo.js");

const expectedModes = [
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

class Hero {
	markup = "";
	select = Object.assign(new EventTarget(), { value: "off", disabled: false });
	status = { hidden: true, textContent: "" };
	details = { open: false };
	active = { textContent: "Off" };

	insertAdjacentHTML(_position: string, markup: string): void {
		this.markup = markup;
	}

	querySelector(selector: string): object | null {
		if (selector === "#hero-demo-mode") {
			return this.select;
		}
		if (selector === ".hero-demo-status") {
			return this.status;
		}
		if (selector === ".hero-demo") {
			return this.details;
		}
		if (selector === "[data-demo-active]") {
			return this.active;
		}
		return null;
	}
}

beforeEach(() => {
	vi.stubGlobal("HTMLSelectElement", Object);
	vi.stubGlobal("HTMLElement", Object);
	vi.stubGlobal("HTMLDetailsElement", Object);
});

afterEach(() => vi.unstubAllGlobals());

describe("hero preview opt-in", () => {
	it.each([
		["https://example.com/", false],
		["https://example.com/?heroDemo=0", false],
		["https://example.com/?heroDemo=1", true],
	])("uses only heroDemo=1 at %s", (href, expected) => {
		// Given a homepage URL with a preview parameter.
		vi.stubGlobal("window", { location: { href } });

		// When the hero checks whether to show the preview.
		const requested = demoRequested();

		// Then only the explicit opt-in enables it.
		expect(requested).toBe(expected);
	});
});

describe("hero preview controls", () => {
	it("offers every named mode in a protected native control", () => {
		// Given a hero with a preview disclosure.
		const hero = new Hero();
		createHeroDemo(hero);

		// When the disclosure markup is read.
		const modes = [
			...hero.markup.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g),
		].map(([, value, label]) => [value, label]);

		// Then a native select inside the protected wrapper offers all modes.
		expect(hero.markup).toContain("data-click-selector");
		expect(hero.markup).toContain("<details");
		expect(hero.markup).toContain("<select");
		expect(hero.markup).toContain("<span data-demo-active>Off</span>");
		expect(modes).toEqual(expectedModes);
	});

	it("applies a selection made before startup", () => {
		// Given a control selected while the field is still loading.
		const hero = new Hero();
		const demo = createHeroDemo(hero);
		hero.select.value = "gravity-slow";
		hero.select.dispatchEvent(new Event("change"));
		const setMode = vi.fn();

		// When the field becomes ready.
		demo.ready(setMode);

		// Then the pending choice reaches the field.
		expect(setMode.mock.calls).toEqual([["gravity-slow"]]);
	});

	it("clears the active effect when set to Off", () => {
		// Given a ready field using an effect.
		const hero = new Hero();
		const demo = createHeroDemo(hero);
		const setMode = vi.fn();
		demo.ready(setMode);
		hero.select.value = "shockwave";
		hero.select.dispatchEvent(new Event("change"));

		// When the visitor selects Off.
		hero.select.value = "off";
		hero.select.dispatchEvent(new Event("change"));

		// Then the field receives Off after the active effect.
		expect(setMode.mock.calls).toEqual([["off"], ["shockwave"], ["off"]]);
	});
});

describe("hero preview feedback", () => {
	it("shows the selected mode while the disclosure is closed", () => {
		// Given a collapsed preview disclosure that starts at Off.
		const hero = new Hero();
		createHeroDemo(hero);
		expect(hero.markup).toContain("<span data-demo-active>Off</span>");

		// When the visitor selects a different mode.
		hero.select.value = "vortex-position";
		hero.select.dispatchEvent(new Event("change"));

		// Then the closed summary names the active candidate.
		expect(hero.active.textContent).toBe("Vortex (position)");
		expect(hero.details.open).toBe(false);
	});

	it("explains when the field cannot run", () => {
		// Given a preview whose field cannot start.
		const hero = new Hero();
		const demo = createHeroDemo(hero);

		// When the page marks the field unavailable.
		demo.unavailable();

		// Then the disabled control has a visible explanation.
		expect(hero.select.disabled).toBe(true);
		expect(hero.details.open).toBe(true);
		expect(hero.status.hidden).toBe(false);
		expect(hero.status.textContent).toContain("unavailable");
	});
});
