import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
type EventRecord = {
	mode: Mode;
	x: number;
	y: number;
	age: number;
	phase?: number | "hold" | "release" | "cancel";
	heldFor?: number;
};
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
type Controller = {
	step: (dt: number) => EventRecord[];
	setMode: (mode: Mode) => void;
	destroy: () => void;
};
const { createClickInput } = await vi.importActual<{
	createClickInput: (hero: Hero, dims: { aspect: number }) => Controller;
}>("../static/js/thought-field-click-input.js");
const win = () => (globalThis as unknown as { window: EventTarget }).window;

class Hero extends EventTarget {
	width = 200;
	height = 100;
	protected = false;
	protectedSelector = "";

	getBoundingClientRect() {
		return { left: 10, top: 20, width: this.width, height: this.height };
	}

	closest(selector: string) {
		return this.protected ||
			(this.protectedSelector !== "" &&
				selector
					.split(",")
					.map((part) => part.trim())
					.includes(this.protectedSelector))
			? this
			: null;
	}
}

function pointer(
	target: EventTarget,
	type: string,
	point: { x: number; y: number; id?: number; eventTarget?: EventTarget },
) {
	const event = Object.assign(new Event(type), {
		clientX: point.x,
		clientY: point.y,
		pointerId: point.id ?? 1,
		button: 0,
	});
	if (point.eventTarget !== undefined) {
		Object.defineProperty(event, "target", { value: point.eventTarget });
	}
	target.dispatchEvent(event);
	return event;
}

function tap(hero: Hero, x: number, y: number, id = 1) {
	pointer(hero, "pointerdown", { x, y, id });
	pointer(win(), "pointerup", { x, y, id });
}

function active(mode: Mode) {
	const hero = new Hero();
	const input = createClickInput(hero, { aspect: 2 });
	input.setMode(mode);
	return { hero, input };
}

beforeEach(() => {
	vi.stubGlobal("Element", Hero);
	vi.stubGlobal("window", new EventTarget());
});

afterEach(() => vi.unstubAllGlobals());

describe("hero click input", () => {
	it("maps mouse clicks and touch taps to the same aspect-scaled point", () => {
		// Given a wide hero with the click mode enabled.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });
		input.setMode("shockwave");

		// When a mouse click and a touch tap land at the same point.
		tap(hero, 60, 45);
		tap(hero, 60, 45, 2);

		// Then both events share the same field coordinates.
		expect(input.step(0)).toMatchObject([
			{ x: -1, y: 0.5, mode: "shockwave" },
			{ x: -1, y: 0.5, mode: "shockwave" },
		]);
		input.destroy();
	});

	it("ignores taps while Off", () => {
		// Given the controller at its initial Off setting.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });

		// When the user taps the field.
		tap(hero, 60, 45);

		// Then no effect is queued.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});
});

describe("hero click boundaries", () => {
	it("ignores a zero-size hero", () => {
		// Given an active hero with no width.
		const { hero, input } = active("scatter");
		hero.width = 0;

		// When the user taps its former area.
		tap(hero, 60, 45);

		// Then no effect is queued.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});

	it("ignores a click released outside the hero", () => {
		// Given a click that starts inside the active hero.
		const { hero, input } = active("scatter");
		pointer(hero, "pointerdown", { x: 60, y: 45 });

		// When the click ends outside the hero.
		pointer(win(), "pointerup", { x: 300, y: 45 });

		// Then no effect is queued.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});
});

describe("hero click lifetime", () => {
	it("keeps only three recent events", () => {
		// Given a shockwave controller.
		const { hero, input } = active("shockwave");

		// When four clicks arrive.
		for (let id = 1; id <= 4; id++) {
			tap(hero, 10 + id * 20, 45, id);
		}

		// Then only the newest three remain.
		const recent = input.step(0);
		expect(recent).toHaveLength(3);
		expect(recent[0]?.x).toBeCloseTo(-1.2);
		input.destroy();
	});

	it("expires a shockwave after its force ends", () => {
		// Given one newly created shockwave.
		const { hero, input } = active("shockwave");
		tap(hero, 60, 45);

		// When time reaches its 2.6 second lifetime.
		const expired = input.step(2.6);

		// Then the event is removed.
		expect(expired).toEqual([]);
		input.destroy();
	});
});

describe("hero gather state", () => {
	it("keeps a gather hold active while pressed", () => {
		// Given a gather press in the hero.
		const { hero, input } = active("gather");
		pointer(hero, "pointerdown", { x: 110, y: 70 });

		// When the hold advances.
		const holding = input.step(0.25);

		// Then the hold carries its elapsed duration.
		expect(holding).toMatchObject([{ phase: "hold", heldFor: 0.25 }]);
		input.destroy();
	});

	it("releases gather with its hold duration", () => {
		// Given a gather hold of one quarter second.
		const { hero, input } = active("gather");
		pointer(hero, "pointerdown", { x: 110, y: 70 });
		input.step(0.25);

		// When the press ends inside the hero.
		pointer(win(), "pointerup", { x: 110, y: 70 });

		// Then the release carries the hold duration.
		expect(input.step(0)).toMatchObject([{ phase: "release", heldFor: 0.25 }]);
		input.destroy();
	});

	it("cancels gather without a release", () => {
		// Given a gather hold in the hero.
		const { hero, input } = active("gather");
		pointer(hero, "pointerdown", { x: 110, y: 70 });

		// When the pointer is cancelled.
		pointer(win(), "pointercancel", { x: 110, y: 70 });

		// Then the hold ends without an event.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});
});

describe("hero click teardown", () => {
	it("stops accepting gestures after destroy", () => {
		// Given an active controller.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });
		input.setMode("turbulence");

		// When the controller is destroyed before another tap.
		input.destroy();
		tap(hero, 60, 45);

		// Then no new event is returned.
		expect(input.step(0)).toEqual([]);
	});
});

describe("hero click modes", () => {
	it("switches every mode and starts each with no prior events", () => {
		// Given an active controller with every available effect mode.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });
		const modes: Exclude<Mode, "off">[] = [
			"shockwave",
			"gravity-implosion",
			"gravity-slow",
			"vortex-alternate",
			"vortex-position",
			"scatter",
			"gather",
			"turbulence",
		];

		// When each mode receives one tap after a switch.
		const observed = modes.map((mode) => {
			input.setMode(mode);
			tap(hero, 110, 70);
			return input.step(0).map((event) => event.mode);
		});
		input.setMode("off");

		// Then each tap uses its selected mode and Off clears the field.
		expect(observed).toEqual(modes.map((mode) => [mode]));
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});
});

describe("hero click release", () => {
	it("releases a gather hold at its press point when the pointer leaves the hero", () => {
		// Given a gather hold at a known point in the field.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });
		input.setMode("gather");
		pointer(hero, "pointerdown", { x: 60, y: 45 });
		input.step(0.2);

		// When the pointer is released outside the hero.
		pointer(win(), "pointerup", { x: 300, y: 45 });

		// Then a release remains at the held point.
		expect(input.step(0)).toMatchObject([
			{ x: -1, y: 0.5, phase: "release", heldFor: 0.2 },
		]);
		input.destroy();
	});
});

describe("hero click protected targets", () => {
	it.each(["a", "button", "summary", "[data-click-selector]"])(
		"ignores %s targets",
		(selector) => {
			// Given a protected target inside an active hero.
			const { hero, input } = active("shockwave");
			hero.protectedSelector = selector;

			// When the user taps that target.
			tap(hero, 60, 45);

			// Then it does not create a field event.
			expect(input.step(0)).toEqual([]);
			input.destroy();
		},
	);

	it("ends gather without release on a protected control", () => {
		// Given a gather hold that began on the open field.
		const { hero, input } = active("gather");
		pointer(hero, "pointerdown", { x: 60, y: 45 });
		input.step(0.2);
		hero.protectedSelector = "button";

		// When the pointer ends over a control.
		pointer(win(), "pointerup", { x: 60, y: 45, eventTarget: hero });

		// Then the hold ends without a release event.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	});
});

describe("hero click effect lifetimes", () => {
	it("expires each effect when its own force ends", () => {
		// Given every effect mode and its force lifetime in seconds.
		const hero = new Hero();
		const input = createClickInput(hero, { aspect: 2 });
		const cases: [Exclude<Mode, "off">, number][] = [
			["shockwave", 2.6],
			["gravity-implosion", 0.65],
			["gravity-slow", 2.4],
			["vortex-alternate", 3],
			["vortex-position", 3],
			["scatter", 0.16],
			["gather", 0.5],
			["turbulence", 1.4],
		];

		// When each effect advances past its own lifetime.
		const expired = cases.map(([mode, duration]) => {
			input.setMode(mode);
			tap(hero, 110, 70);
			const before = input.step(duration - 0.02).length;
			const after = input.step(0.03).length;
			return [before, after];
		});

		// Then every effect exists before its limit and none remains after it.
		expect(expired).toEqual(cases.map(() => [1, 0]));
		input.destroy();
	});
});
