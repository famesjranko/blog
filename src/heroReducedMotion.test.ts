import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REDUCE = "(prefers-reduced-motion: reduce)";

// The hero element hero.js finds. It has no canvas, so a field that
// does start stops at the canvas lookup, before any download.
class FakeHero {
	readonly lookups: string[] = [];
	querySelector(selector: string): null {
		this.lookups.push(selector);
		return null;
	}
	addEventListener(): void {}
}

// Imports hero.js fresh on a page whose reduced-motion setting is REDUCED.
async function loadHero(reduced: boolean): Promise<FakeHero> {
	const hero = new FakeHero();
	vi.stubGlobal("HTMLElement", FakeHero);
	vi.stubGlobal("HTMLCanvasElement", class {});
	vi.stubGlobal("document", { querySelector: () => hero });
	vi.stubGlobal("window", {
		matchMedia: (query: string) => ({ matches: reduced && query === REDUCE }),
	});
	await import("../static/js/hero.js");
	return hero;
}

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("hero under reduced motion", () => {
	it("starts no field, and so no orbit, when reduced motion is set", async () => {
		// Given a page that prefers reduced motion
		const reduced = true;

		// When hero.js runs
		const hero = await loadHero(reduced);

		// Then it never looks for the field's canvas
		expect(hero.lookups).not.toContain("[data-thought-field]");
	});

	it("looks for the field's canvas when motion is allowed", async () => {
		// Given a page with no motion preference
		const reduced = false;

		// When hero.js runs
		const hero = await loadHero(reduced);

		// Then it looks for the field's canvas to start the field
		expect(hero.lookups).toContain("[data-thought-field]");
	});
});
