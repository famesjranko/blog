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

type PointerOptions = {
	on: FakeElement;
	button?: number;
	buttons?: number;
	clientX?: number;
	clientY?: number;
	isPrimary?: boolean;
	pointerId?: number;
};

// A pointer event as the module reads it. PointerEvent is stubbed as
// Event, so this passes the module's instanceof check.
function pointer(type: string, options: PointerOptions): Event {
	return Object.defineProperties(new Event(type), {
		target: { value: options.on },
		pointerId: { value: options.pointerId ?? 1 },
		isPrimary: { value: options.isPrimary ?? true },
		button: { value: options.button ?? 0 },
		buttons: { value: options.buttons ?? 1 },
		// The centre of the hero's 200 by 100 box.
		clientX: { value: options.clientX ?? 100 },
		clientY: { value: options.clientY ?? 50 },
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
	return orbitingAt(orbit, 0.25, 0);
}

function orbitingAt(orbit: Orbit, x: number, y: number): boolean {
	const field = { count: 1, pos: Float32Array.from([x, y, 0]) };
	orbit.advance(DT);
	orbit.stir(field, DT);
	return field.pos[0] !== x || field.pos[1] !== y;
}

async function listening(hero: FakeElement): Promise<Orbit> {
	const { listenForOrbit } = await import(
		"../static/js/thought-field-orbit-input.js"
	);
	const orbit = createOrbit();
	listenForOrbit(hero, orbit);
	return orbit;
}

let win: EventTarget;

beforeEach(() => {
	win = new EventTarget();
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

	it("starts an orbit on a press on hero text", async () => {
		// Given a hero listening for presses
		const { hero, text } = page();
		const orbit = await listening(hero);

		// When the primary button goes down on the standfirst
		hero.dispatchEvent(pointer("pointerdown", { on: text }));

		// Then particles near the text orbit
		expect(orbiting(orbit)).toBe(true);
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

describe("orbit pointer movement", () => {
	it("follows the held pointer across the field", async () => {
		// Given a held press at the centre of the open field
		const { hero, inner } = page();
		const orbit = await listening(hero);
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// When that pointer moves right while its primary button stays held
		win.dispatchEvent(
			pointer("pointermove", { on: inner, clientX: 150, buttons: 1 }),
		);

		// Then a particle near the new point orbits there
		expect(orbitingAt(orbit, 1.25, 0)).toBe(true);
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

describe("stale orbit pointer cleanup", () => {
	it("ends a stale hold when movement has no primary button", async () => {
		// Given a pointerup was missed after a hold began
		const { hero, inner } = page();
		const orbit = await listening(hero);
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// When the pointer next moves with no primary button held
		win.dispatchEvent(pointer("pointermove", { on: inner, buttons: 0 }));
		for (let t = 0; t < TAIL_S; t += DT) {
			orbit.advance(DT);
		}

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});

	it("ends the hold when the window loses focus", async () => {
		// Given a held press in the open field
		const { hero, inner } = page();
		const orbit = await listening(hero);
		hero.dispatchEvent(pointer("pointerdown", { on: inner }));

		// When the pointer context leaves the window
		win.dispatchEvent(new Event("blur"));
		for (let t = 0; t < TAIL_S; t += DT) {
			orbit.advance(DT);
		}

		// Then nothing orbits
		expect(orbiting(orbit)).toBe(false);
	});
});
