import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Orbit } from "../static/js/thought-field-orbit.js";
import { createOrbit } from "../static/js/thought-field-orbit.js";

const DT = 1 / 60;
const TAIL_S = 0.25;

// Enough of a DOM element for the module: a tag, a parent, and
// closest() over comma-separated tag selectors.
class FakeElement extends EventTarget {
	constructor(
		readonly tag: string,
		readonly parent: FakeElement | null = null,
	) {
		super();
	}
	closest(selector: string): FakeElement | null {
		const tags = selector.split(",").map((part) => part.trim());
		if (tags.includes(this.tag)) {
			return this;
		}
		return this.parent?.closest(selector) ?? null;
	}
	getBoundingClientRect() {
		return { left: 0, top: 0, width: 200, height: 100 };
	}
}

type Press = { on: FakeElement; button?: number; isPrimary?: boolean };

// A pointer event as the module reads it. PointerEvent is stubbed as
// Event, so this passes the module's instanceof check.
function pointer(type: string, press: Press): Event {
	return Object.defineProperties(new Event(type), {
		target: { value: press.on },
		pointerId: { value: 1 },
		isPrimary: { value: press.isPrimary ?? true },
		button: { value: press.button ?? 0 },
		// The centre of the hero's 200 by 100 box.
		clientX: { value: 100 },
		clientY: { value: 50 },
	});
}

// The hero as the page builds it: copy and links inside a wrapper.
function page() {
	const hero = new FakeElement("section");
	const inner = new FakeElement("div", hero);
	const text = new FakeElement("p", inner);
	const link = new FakeElement("a", new FakeElement("p", inner));
	return { hero, inner, text, link };
}

// Whether a particle just right of the hero's centre moves this frame.
function orbiting(orbit: Orbit): boolean {
	const field = { count: 1, pos: Float32Array.from([0.25, 0, 0]) };
	orbit.advance(DT);
	orbit.stir(field, DT);
	return field.pos[1] !== 0;
}

async function listening(hero: FakeElement): Promise<Orbit> {
	const { listenForOrbit } = await import(
		"../static/js/thought-field-orbit-input.js"
	);
	const orbit = createOrbit();
	listenForOrbit(hero, orbit);
	return orbit;
}

const win = new EventTarget();

beforeEach(() => {
	vi.stubGlobal("window", win);
	vi.stubGlobal("Element", FakeElement);
	vi.stubGlobal("PointerEvent", Event);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("where a press starts an orbit", () => {
	it("starts an orbit on a press in the open field", async () => {
		// Given a hero listening for presses
		const { hero, inner } = page();
		const orbit = await listening(hero);

		// When the primary button goes down on open space at its centre
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// Then particles near the centre orbit
		expect(orbiting(orbit)).toBe(true);
	});

	it("starts no orbit on a press on a link", async () => {
		// Given a hero listening for presses
		const { hero, link } = page();
		const orbit = await listening(hero);

		// When the primary button goes down on a link
		hero.dispatchEvent(pointer("pointerdown", { on: link }));

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});

	it("starts no orbit on a press on hero text", async () => {
		// Given a hero listening for presses
		const { hero, text } = page();
		const orbit = await listening(hero);

		// When the primary button goes down on the standfirst
		hero.dispatchEvent(pointer("pointerdown", { on: text }));

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});

	it("starts no orbit on a secondary button press", async () => {
		// Given a hero listening for presses
		const { hero, inner } = page();
		const orbit = await listening(hero);

		// When the right button goes down on open space
		const press = { on: inner, button: 2 };
		hero.dispatchEvent(pointer("pointerdown", press));

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});
});

describe("which pointer starts an orbit", () => {
	it("starts no orbit on a press from a non-primary pointer", async () => {
		// Given a hero listening for presses
		const { hero, inner } = page();
		const orbit = await listening(hero);

		// When a second finger goes down on open space
		const press = { on: inner, isPrimary: false };
		hero.dispatchEvent(pointer("pointerdown", press));

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});
});

describe("orbit pointer release", () => {
	it("ends the hold on pointerup", async () => {
		// Given a held press in the open field
		const { hero, inner } = page();
		const orbit = await listening(hero);
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// When the pointer goes up on the window and the tail passes
		win.dispatchEvent(pointer("pointerup", { on: inner }));
		for (let t = 0; t < TAIL_S; t += DT) {
			orbit.advance(DT);
		}

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});

	it("ends the hold on pointercancel", async () => {
		// Given a held press in the open field
		const { hero, inner } = page();
		const orbit = await listening(hero);
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// When the browser cancels the pointer and the tail passes
		win.dispatchEvent(pointer("pointercancel", { on: inner }));
		for (let t = 0; t < TAIL_S; t += DT) {
			orbit.advance(DT);
		}

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});
});
