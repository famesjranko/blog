import { describe, expect, it } from "vitest";
import type { PillInputs } from "../static/js/thought-field-lab-permission.js";
import {
	motionRequester,
	pillMessage,
	pillVisible,
	shouldShowPill,
} from "../static/js/thought-field-lab-permission.js";

// A phone that could ask, has seen nothing, and has waited long enough.
const OFFERED: PillInputs = {
	supported: true,
	canRequest: true,
	sawReading: false,
	elapsedMs: 1500,
};

describe("shouldShowPill", () => {
	it("offers the pill once 1.5 s pass with no reading on a phone that can ask", () => {
		expect(shouldShowPill(OFFERED)).toBe(true);
	});

	it("waits until 1.5 s have passed", () => {
		expect(shouldShowPill({ ...OFFERED, elapsedMs: 1499 })).toBe(false);
	});

	it("stays away once a valid reading has arrived", () => {
		expect(shouldShowPill({ ...OFFERED, sawReading: true })).toBe(false);
	});

	it("stays away where the browser cannot ask", () => {
		expect(shouldShowPill({ ...OFFERED, canRequest: false })).toBe(false);
	});

	it("stays away where motion is not supported", () => {
		expect(shouldShowPill({ ...OFFERED, supported: false })).toBe(false);
	});
});

describe("pillVisible", () => {
	const idle = { forced: false, dismissed: false, message: null };
	const waiting = { ...OFFERED, elapsedMs: 0 };

	it("follows the visitor conditions while untouched", () => {
		expect(pillVisible(idle, OFFERED)).toBe(true);
		expect(pillVisible(idle, waiting)).toBe(false);
	});

	it("shows at once when forced by Show pill again", () => {
		expect(pillVisible({ ...idle, forced: true }, waiting)).toBe(true);
	});

	it("keeps a refusal message up after a reading arrives", () => {
		const blocked = { ...idle, message: "Motion blocked in site settings" };
		expect(pillVisible(blocked, { ...OFFERED, sawReading: true })).toBe(true);
	});

	it("stays hidden once dismissed, even when forced", () => {
		const gone = { forced: true, dismissed: true, message: "x" };
		expect(pillVisible(gone, OFFERED)).toBe(false);
	});
});

describe("motionRequester", () => {
	it("is null without a DeviceMotionEvent", () => {
		expect(motionRequester(undefined)).toBeNull();
		expect(motionRequester(null)).toBeNull();
	});

	it("is null when DeviceMotionEvent has no requestPermission", () => {
		expect(motionRequester({})).toBeNull();
		expect(motionRequester({ requestPermission: "granted" })).toBeNull();
	});

	it("asks through DeviceMotionEvent and passes its answer on", async () => {
		const asked: unknown[] = [];
		const ctor = {
			requestPermission(this: unknown): Promise<string> {
				asked.push(this);
				return Promise.resolve("denied");
			},
		};
		const request = motionRequester(ctor);
		await expect(request?.()).resolves.toBe("denied");
		expect(asked).toEqual([ctor]);
	});
});

describe("pillMessage", () => {
	it("clears the pill after a grant", () => {
		expect(pillMessage("granted")).toBeNull();
	});

	it("points at site settings after a refusal or an error", () => {
		const blocked = "Motion blocked in site settings";
		expect(pillMessage("denied")).toBe(blocked);
		expect(pillMessage("error: NotAllowedError")).toBe(blocked);
	});

	it("says so where the browser cannot ask", () => {
		expect(pillMessage("unavailable")).toBe("Motion not available here");
	});
});
