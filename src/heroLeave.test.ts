import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LeaveCanvas } from "../static/js/hero.js";

// Set in static/js/hero.js; restated so a changed grace fails here.
const GRACE_MS = 5000;

interface Page {
	win: EventTarget;
	visibility: () => string | undefined;
	canvas: LeaveCanvas;
}

function page(): Page {
	const props = new Map<string, string>();
	const canvas: LeaveCanvas = {
		style: {
			setProperty: (name, value) => {
				props.set(name, value);
			},
			removeProperty: (name) => {
				props.delete(name);
				return "";
			},
		},
	};
	const win = Object.assign(new EventTarget(), {
		setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
		clearTimeout: (id: number) => clearTimeout(id),
	});
	vi.stubGlobal("window", win);
	return { win, visibility: () => props.get("visibility"), canvas };
}

async function guarded(chromium = true): Promise<Page> {
	vi.stubGlobal("navigator", chromium ? { userAgentData: {} } : {});
	const p = page();
	const { hideFieldOnLeave } = await import("../static/js/hero.js");
	hideFieldOnLeave(p.canvas);
	return p;
}

beforeEach(() => {
	vi.useFakeTimers();
	// No hero on the page, so importing hero.js starts nothing.
	vi.stubGlobal("document", { querySelector: () => null });
	vi.stubGlobal("HTMLElement", class {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("hideFieldOnLeave while leaving", () => {
	it("hides the canvas when navigation starts", async () => {
		// Given a guarded canvas in Chromium
		const { win, visibility } = await guarded();
		// When the page fires beforeunload
		win.dispatchEvent(new Event("beforeunload"));
		// Then the canvas is hidden
		expect(visibility()).toBe("hidden");
	});

	it("stays hidden until the grace ends, so a slow commit is covered", async () => {
		// Given a navigation that has started
		const { win, visibility } = await guarded();
		win.dispatchEvent(new Event("beforeunload"));
		// When the page is still here just before the grace ends
		vi.advanceTimersByTime(GRACE_MS - 1);
		// Then the canvas is still hidden
		expect(visibility()).toBe("hidden");
	});

	it("restarts the grace when a second navigation starts", async () => {
		// Given a stopped navigation, then a second one started late in its grace
		const { win, visibility } = await guarded();
		win.dispatchEvent(new Event("beforeunload"));
		vi.advanceTimersByTime(GRACE_MS - 100);
		win.dispatchEvent(new Event("beforeunload"));
		// When the first navigation's grace has passed
		vi.advanceTimersByTime(100);
		// Then the canvas stays hidden for the second navigation
		expect(visibility()).toBe("hidden");
	});
});

describe("hideFieldOnLeave leaves the field visible", () => {
	it("shows the canvas again when the navigation never replaces the page", async () => {
		// Given a navigation that has started
		const { win, visibility } = await guarded();
		win.dispatchEvent(new Event("beforeunload"));
		// When the page is still here after the grace
		vi.advanceTimersByTime(GRACE_MS);
		// Then the canvas is visible again
		expect(visibility()).toBeUndefined();
	});

	it("shows the canvas at once on a back/forward cache restore", async () => {
		// Given a page that left while hidden
		const { win, visibility } = await guarded();
		win.dispatchEvent(new Event("beforeunload"));
		// When the cache restores it
		win.dispatchEvent(new Event("pageshow"));
		// Then the canvas is visible without waiting for the grace
		expect(visibility()).toBeUndefined();
	});

	it("does not listen outside Chromium, to keep Firefox's page cache", async () => {
		// Given a browser without userAgentData
		const { win, visibility } = await guarded(false);
		// When the page fires beforeunload
		win.dispatchEvent(new Event("beforeunload"));
		// Then the canvas is untouched
		expect(visibility()).toBeUndefined();
	});
});
