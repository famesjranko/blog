import { afterEach, beforeEach, expect, it, vi } from "vitest";

type Mode = "off" | "hold-pull" | "hold-push" | "hold-orbit";
type Record = {
	mode: Mode;
	x: number;
	y: number;
	age: number;
	strength: number;
	phase: "hold" | "release";
	heldFor: number;
};
type Controller = {
	step: (dt: number) => Record[];
	setMode: (mode: Mode) => void;
	destroy: () => void;
};
const { createClickInput } = await vi.importActual<{
	createClickInput: (hero: Hero, dims: { aspect: number }) => Controller;
}>("../static/js/thought-field-click-input.js");

class Hero extends EventTarget {
	protected = false;
	setPointerCapture(_id: number) {}
	getBoundingClientRect() {
		return { left: 10, top: 20, width: 200, height: 100 };
	}
	closest() {
		return this.protected ? this : null;
	}
}

function pointer(
	target: EventTarget,
	type: string,
	options: {
		x?: number;
		y?: number;
		id?: number;
		button?: number;
		eventTarget?: EventTarget;
	} = {},
) {
	const event = Object.assign(new Event(type, { cancelable: true }), {
		clientX: options.x ?? 60,
		clientY: options.y ?? 45,
		pointerId: options.id ?? 1,
		button: options.button ?? 0,
	});
	if (options.eventTarget) {
		Object.defineProperty(event, "target", { value: options.eventTarget });
	}
	target.dispatchEvent(event);
	return event;
}

function setup(mode: Mode) {
	const hero = new Hero();
	const input = createClickInput(hero, { aspect: 2 });
	input.setMode(mode);
	const win = (globalThis as unknown as { window: EventTarget }).window;
	return { hero, input, win };
}

beforeEach(() => {
	vi.stubGlobal("Element", Hero);
	vi.stubGlobal("window", new EventTarget());
});
afterEach(() => vi.unstubAllGlobals());

it.each(["hold-pull", "hold-push", "hold-orbit"] as const)(
	"starts %s at the press point and holds it across frames",
	(mode) => {
		// Given an active hold mode and an untouched field.
		const { hero, input } = setup(mode);
		expect(input.step(0)).toEqual([]);

		// When the primary pointer presses the field and two frames pass.
		pointer(hero, "pointerdown");
		const immediate = input.step(0);
		const first = input.step(0.2);
		const second = input.step(1);

		// Then the effect starts immediately and stays at its press point.
		expect(immediate).toMatchObject([
			{ mode, x: -1, y: 0.5, age: 0, strength: 1, phase: "hold", heldFor: 0 },
		]);
		expect(first).toMatchObject([
			{ x: -1, y: 0.5, phase: "hold", heldFor: 0.2 },
		]);
		expect(second).toMatchObject([
			{ x: -1, y: 0.5, phase: "hold", heldFor: 1.2 },
		]);
		input.destroy();
	},
);

it("ignores another pointer and gives a brief tap a bounded tail", () => {
	// Given one active pull hold.
	const { hero, input, win } = setup("hold-pull");
	pointer(hero, "pointerdown");

	// When another pointer releases and cancels before the owner releases elsewhere.
	pointer(win, "pointerup", { id: 2 });
	pointer(win, "pointercancel", { id: 2 });
	const stillHeld = input.step(0);
	pointer(win, "pointerup", { x: 300 });
	const released = input.step(0);
	const faded = input.step(0.25);

	// Then only the owner's release starts a short tail at the press point.
	expect(stillHeld).toMatchObject([{ phase: "hold", heldFor: 0 }]);
	expect(released).toMatchObject([{ x: -1, y: 0.5, phase: "release", age: 0 }]);
	expect(faded).toEqual([]);
	input.destroy();
});

it.each(["pointercancel", "protected", "mode", "destroy"] as const)(
	"clears hold and tail on %s",
	(reason) => {
		// Given a new hold and a previous tail.
		const { hero, input, win } = setup("hold-orbit");
		pointer(hero, "pointerdown");
		pointer(win, "pointerup");
		pointer(hero, "pointerdown");

		// When the active gesture is interrupted.
		if (reason === "pointercancel") {
			pointer(win, "pointercancel");
		}
		if (reason === "protected") {
			hero.protected = true;
			pointer(win, "pointerup", { eventTarget: hero });
		}
		if (reason === "mode") {
			input.setMode("off");
		}
		if (reason === "destroy") {
			input.destroy();
		}

		// Then neither the hold nor a release tail remains.
		expect(input.step(0)).toEqual([]);
		input.destroy();
	},
);

it("ignores invalid starts and leaves touch and pointer ownership alone", () => {
	// Given an active push mode and a field that can receive pointer events.
	const hero = new Hero();
	const win = (globalThis as unknown as { window: EventTarget }).window;
	const downListener = vi.spyOn(hero, "addEventListener");
	const windowListener = vi.spyOn(win, "addEventListener");
	const input = createClickInput(hero, { aspect: 2 });
	input.setMode("hold-push");
	const capture = vi.spyOn(hero, "setPointerCapture");

	// When presses start on a control, with a secondary button, or outside the field.
	hero.protected = true;
	pointer(hero, "pointerdown");
	hero.protected = false;
	pointer(hero, "pointerdown", { button: 2 });
	pointer(hero, "pointerdown", { x: 300 });
	const invalid = input.step(0);
	const touch = pointer(hero, "pointerdown");

	// Then only the valid press acts without capturing or cancelling the pointer.
	expect(invalid).toEqual([]);
	expect(input.step(0)).toMatchObject([{ phase: "hold" }]);
	expect(downListener).toHaveBeenCalledWith(
		"pointerdown",
		expect.any(Function),
		{
			passive: true,
		},
	);
	expect(windowListener).toHaveBeenCalledWith(
		"pointerup",
		expect.any(Function),
		{
			passive: true,
		},
	);
	expect(windowListener).toHaveBeenCalledWith(
		"pointercancel",
		expect.any(Function),
		{
			passive: true,
		},
	);
	expect(capture).not.toHaveBeenCalled();
	expect(touch.defaultPrevented).toBe(false);
	input.destroy();
});

it("leaves Off inert", () => {
	// Given the Off mode.
	const { hero, input } = setup("off");

	// When a pointer presses the open field.
	pointer(hero, "pointerdown");

	// Then no hold starts.
	expect(input.step(1)).toEqual([]);
	input.destroy();
});
