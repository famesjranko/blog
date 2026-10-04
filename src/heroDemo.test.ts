import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mode = "off" | "hold-pull" | "hold-push" | "hold-orbit";
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
	["hold-pull", "Hold: pull inward"],
	["hold-push", "Hold: push outward"],
	["hold-orbit", "Hold: orbit"],
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
		["https://example.com/?heroDemo=10", false],
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
	it("offers only Off and the three hold modes in a protected native control", () => {
		// Given a hero with a preview disclosure.
		const hero = new Hero();
		createHeroDemo(hero);

		// When the disclosure markup is read.
		const modes = [
			...hero.markup.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g),
		].map(([, value, label]) => [value, label]);

		// Then a native select inside the protected wrapper offers exactly four modes.
		expect(hero.markup).toContain("data-click-selector");
		expect(hero.markup).toContain("<details");
		expect(hero.markup).toContain("<select");
		expect(hero.markup).toContain("<span data-demo-active>Off</span>");
		expect(hero.markup).toContain("press and hold the field");
		expect(modes).toEqual(expectedModes);
	});

	it("applies a selection made before startup", () => {
		// Given a control selected while the field is still loading.
		const hero = new Hero();
		const demo = createHeroDemo(hero);
		hero.select.value = "hold-push";
		hero.select.dispatchEvent(new Event("change"));
		const setMode = vi.fn();

		// When the field becomes ready.
		demo.ready(setMode);

		// Then the pending choice reaches the field.
		expect(setMode.mock.calls).toEqual([["hold-push"]]);
	});

	it("clears the active effect when set to Off", () => {
		// Given a ready field using an effect.
		const hero = new Hero();
		const demo = createHeroDemo(hero);
		const setMode = vi.fn();
		demo.ready(setMode);
		hero.select.value = "hold-pull";
		hero.select.dispatchEvent(new Event("change"));

		// When the visitor selects Off.
		hero.select.value = "off";
		hero.select.dispatchEvent(new Event("change"));

		// Then the field receives Off after the active effect.
		expect(setMode.mock.calls).toEqual([["off"], ["hold-pull"], ["off"]]);
	});
});

it.each(["hold-pull", "hold-push", "hold-orbit"] as const)(
	"applies the %s hold mode",
	(mode) => {
		// Given a ready field with its preview set to Off.
		const hero = new Hero();
		const demo = createHeroDemo(hero);
		const setMode = vi.fn();
		demo.ready(setMode);

		// When the visitor chooses a hold effect.
		hero.select.value = mode;
		hero.select.dispatchEvent(new Event("change"));

		// Then that mode reaches the field and the summary names it.
		expect(setMode.mock.calls).toEqual([["off"], [mode]]);
		expect(hero.active.textContent).toBe(
			expectedModes.find(([value]) => value === mode)?.[1],
		);
	},
);

describe("hero preview feedback", () => {
	it("shows the selected mode while the disclosure is closed", () => {
		// Given a collapsed preview disclosure that starts at Off.
		const hero = new Hero();
		createHeroDemo(hero);
		expect(hero.markup).toContain("<span data-demo-active>Off</span>");

		// When the visitor selects a different mode.
		hero.select.value = "hold-orbit";
		hero.select.dispatchEvent(new Event("change"));

		// Then the closed summary names the active candidate.
		expect(hero.active.textContent).toBe("Hold: orbit");
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
