import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	demoUrl,
	fieldPoint,
	listenForPresses,
	modeLabel,
	nextMode,
	parseDemo,
} from "../static/js/thought-field-click-demo.js";
import { keyPick } from "../static/js/thought-field-click-panel.js";
import type { ClickMode } from "../static/js/thought-field-clicks.js";
import { createClicks } from "../static/js/thought-field-clicks.js";

const still = () => {};
const MODES: ReadonlyArray<ClickMode> = [
	{ id: "off", label: "Off", hold: false, life: 0, force: still },
	{ id: "scatter", label: "Scatter", hold: false, life: 0.3, force: still },
	{ id: "gather", label: "Gather", hold: true, life: 0.5, force: still },
];
const BOX = { left: 100, top: 50, width: 800, height: 400 };

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("the demo URL", () => {
	it("opens the mode it names", () => {
		// Given a URL naming a known mode
		// When it is parsed
		// Then that mode opens
		expect(parseDemo("?hero-demo=gather", MODES)).toBe("gather");
	});

	it("opens scatter for an empty or unknown value", () => {
		// Given URLs with no value, an empty value and an unknown value
		// When they are parsed
		// Then each opens scatter
		expect(parseDemo("?hero-demo", MODES)).toBe("scatter");
		// And the empty and unknown values do too
		expect(parseDemo("?hero-demo=", MODES)).toBe("scatter");
		expect(parseDemo("?hero-demo=nope", MODES)).toBe("scatter");
	});

	it("keeps the rest of the URL when the mode changes", () => {
		// Given a page URL with another parameter and a hash
		const href = "https://example.test/?a=1&hero-demo=off#top";

		// When the mode becomes gather
		const next = demoUrl(href, "gather");

		// Then only the mode changes
		expect(next).toBe("https://example.test/?a=1&hero-demo=gather#top");
	});
});

describe("switching modes", () => {
	it("steps forward and back, wrapping at both ends", () => {
		// Given the last and the first mode
		// When they step past the end and before the start
		// Then they wrap around
		expect(nextMode(MODES, "gather", 1)).toBe("off");
		expect(nextMode(MODES, "off", -1)).toBe("gather");
		// And a plain step moves by one
		expect(nextMode(MODES, "off", 1)).toBe("scatter");
	});

	it("labels a mode with its place and name", () => {
		// Given the second of three modes
		// When it is labelled
		// Then the label reads 2/3 and the name
		expect(modeLabel(MODES, "scatter")).toBe("2/3  Scatter");
	});

	it("maps number keys to places and brackets to steps", () => {
		// Given the current mode scatter
		// When 3, [ and 9 are pressed
		// Then 3 picks the third mode
		expect(keyPick("3", MODES, "scatter")).toEqual({ from: "gather", step: 0 });
		// And [ steps back from the current mode
		expect(keyPick("[", MODES, "scatter")).toEqual({
			from: "scatter",
			step: -1,
		});
		// And a number past the last mode asks for nothing
		expect(keyPick("9", MODES, "scatter")).toBeNull();
	});
});

describe("presses on the hero", () => {
	it("land in field space, y up, x scaled by the aspect", () => {
		// Given a hero box twice as wide as it is tall
		// When its top-left and bottom-right corners are pressed
		// Then they map to (-aspect, 1) and (aspect, -1)
		expect(fieldPoint(BOX, 100, 50)).toEqual({ x: -2, y: 1 });
		expect(fieldPoint(BOX, 900, 450)).toEqual({ x: 2, y: -1 });
	});

	it("start a click and a pointercancel releases it", () => {
		// Given a hero listening for presses in a held mode
		const hero = pressTarget();
		const clicks = createClicks(MODES[2] as ClickMode);
		listenForPresses(hero, clicks);
		hero.dispatchEvent(pointer("pointerdown", 7));

		// When the browser cancels that pointer to scroll
		hero.dispatchEvent(pointer("pointercancel", 7));

		// Then the click is live and released
		expect(clicks.live()).toMatchObject([{ x: 1, y: 0.5, released: 0 }]);
	});

	it("ignore presses on links", () => {
		// Given a hero listening for presses, with a link in it
		vi.stubGlobal("Element", FakeElement);
		const hero = pressTarget();
		const clicks = createClicks(MODES[2] as ClickMode);
		listenForPresses(hero, clicks);

		// When the link is pressed
		hero.dispatchEvent(pointer("pointerdown", 1, new FakeElement("a")));

		// Then no click starts
		expect(clicks.live()).toEqual([]);
	});
});

// Stands in for Element and HTMLElement, which Node lacks.
class FakeElement extends EventTarget {
	constructor(readonly tag: string) {
		super();
	}

	closest(selector: string): FakeElement | null {
		return selector.split(", ").includes(this.tag) ? this : null;
	}
}

function pressTarget() {
	return Object.assign(new EventTarget(), {
		getBoundingClientRect: () => BOX,
	});
}

// A primary press halfway between the hero's centre and its top-right
// corner: (1, 0.5) in field space.
function pointer(type: string, pointerId: number, target?: object): Event {
	const event = Object.assign(new Event(type), {
		button: 0,
		clientX: 700,
		clientY: 150,
		pointerId,
	});
	if (target !== undefined) {
		Object.defineProperty(event, "target", { value: target });
	}
	return event;
}

// The few DOM members the panel and the hero use.
interface Node {
	attrs: Map<string, string>;
	children: Node[];
	textContent: string;
	setAttribute(name: string, value: string): void;
	append(...more: Node[]): void;
	addEventListener(): void;
}

function node(): Node {
	const attrs = new Map<string, string>();
	const children: Node[] = [];
	return {
		attrs,
		children,
		textContent: "",
		setAttribute: (name, value) => {
			attrs.set(name, value);
		},
		append: (...more) => {
			children.push(...more);
		},
		addEventListener: still,
	};
}

// A page with a hero under reduced motion, so the field never starts.
function page(search: string) {
	const body = node();
	const hero = Object.assign(new FakeElement("section"), node());
	const listen = vi.spyOn(hero, "addEventListener");
	const replaced: string[] = [];
	vi.stubGlobal("HTMLElement", FakeElement);
	vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
	vi.stubGlobal("location", { search, href: `https://x.test/${search}` });
	vi.stubGlobal("history", {
		state: null,
		replaceState: (_: unknown, __: string, url: string) => replaced.push(url),
	});
	vi.stubGlobal("document", {
		querySelector: () => hero,
		createElement: node,
		body,
		addEventListener: still,
	});
	return { body, hero, listen, replaced };
}

describe("hero.js and the opt-in demo", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("adds nothing to a page without hero-demo", async () => {
		// Given a page without the parameter
		const { body, hero, listen } = page("");

		// When hero.js runs and any import it started settles
		await import("../static/js/hero.js");
		await vi.dynamicImportSettled();

		// Then the hero has no new listener or attribute
		expect(listen).not.toHaveBeenCalled();
		expect(hero.attrs.size).toBe(0);
		// And the page has no panel
		expect(body.children).toEqual([]);
	});

	it("mounts the panel with the reason when the field cannot run", async () => {
		// Given a page with the parameter
		const { body, hero, replaced } = page("?hero-demo");

		// When hero.js runs and the demo module has loaded
		await import("../static/js/hero.js");
		await vi.dynamicImportSettled();

		// Then one panel says the field is off and why
		expect(body.children).toHaveLength(1);
		const texts = body.children[0]?.children.map((child) => child.textContent);
		expect(texts).toContain("The field is off: reduced motion is on.");
		// And the hero and the URL show scatter
		expect(hero.attrs.get("data-click-mode")).toBe("scatter");
		expect(replaced).toEqual(["https://x.test/?hero-demo=scatter"]);
	});
});
