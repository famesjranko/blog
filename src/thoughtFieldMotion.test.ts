import { describe, expect, it } from "vitest";
import type { MotionEnv } from "../static/js/thought-field-motion.js";
import { motionSupported } from "../static/js/thought-field-motion.js";

const COARSE_QUERY = "(pointer: coarse)";

// A matchMedia that reports only the coarse-pointer query as matching.
function pointer(coarse: boolean): MotionEnv["matchMedia"] {
	return (query) => ({ matches: coarse && query === COARSE_QUERY });
}

// Stand-ins for the DeviceMotionEvent constructor each browser exposes.
const PromptingMotionEvent = {
	requestPermission: (): Promise<string> => Promise.resolve("granted"),
};
const PlainMotionEvent = {};

describe("motionSupported", () => {
	it("accepts a touch browser whose DeviceMotionEvent has requestPermission (Android Chromium)", () => {
		const env = {
			matchMedia: pointer(true),
			DeviceMotionEvent: PromptingMotionEvent,
		};
		expect(motionSupported(env)).toBe(true);
	});

	it("accepts a touch browser whose DeviceMotionEvent lacks requestPermission", () => {
		const env = {
			matchMedia: pointer(true),
			DeviceMotionEvent: PlainMotionEvent,
		};
		expect(motionSupported(env)).toBe(true);
	});

	it("rejects a fine-pointer browser even with DeviceMotionEvent", () => {
		const env = {
			matchMedia: pointer(false),
			DeviceMotionEvent: PlainMotionEvent,
		};
		expect(motionSupported(env)).toBe(false);
	});

	it("rejects a touch browser without DeviceMotionEvent", () => {
		const env = { matchMedia: pointer(true) };
		expect(motionSupported(env)).toBe(false);
	});
});
