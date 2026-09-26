import { describe, expect, it } from "vitest";
import type { MotionEnv } from "../static/js/thought-field-motion.js";
import {
	motionSupported,
	readingFrom,
	toScreenAxes,
} from "../static/js/thought-field-motion.js";

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

describe("toScreenAxes", () => {
	// Device +x and +y unit readings, and where each points on screen.
	it.each([
		{ angle: 0, x: { x: 1, y: 0 }, y: { x: 0, y: 1 } },
		// Top turned to the left: device +x points up, device +y points left.
		{ angle: 90, x: { x: 0, y: 1 }, y: { x: -1, y: 0 } },
		{ angle: 180, x: { x: -1, y: 0 }, y: { x: 0, y: -1 } },
		{ angle: 270, x: { x: 0, y: -1 }, y: { x: 1, y: 0 } },
	])("rotates device axes into screen axes at $angle°", ({ angle, x, y }) => {
		const fromX = toScreenAxes({ x: 1, y: 0 }, angle);
		const fromY = toScreenAxes({ x: 0, y: 1 }, angle);
		expect(fromX.x).toBeCloseTo(x.x, 12);
		expect(fromX.y).toBeCloseTo(x.y, 12);
		expect(fromY.x).toBeCloseTo(y.x, 12);
		expect(fromY.y).toBeCloseTo(y.y, 12);
	});
});

describe("readingFrom", () => {
	const UPRIGHT = { x: 0, y: 9.81 };

	it("reads the acceleration alone, with no gyroscope twist", () => {
		expect(readingFrom(UPRIGHT, 0)).toStrictEqual(UPRIGHT);
	});

	it.each([
		{ case: "no acceleration", accel: null },
		{ case: "a null x", accel: { x: null, y: 9.81 } },
		{ case: "a null y", accel: { x: 0, y: null } },
	])("gives no reading for $case", ({ accel }) => {
		expect(readingFrom(accel, 0)).toBeNull();
	});

	it("rotates x and y into screen axes", () => {
		// Top turned to the left: device +x points up the screen.
		const reading = readingFrom({ x: 1, y: 0 }, 90);
		expect(reading?.x).toBeCloseTo(0, 12);
		expect(reading?.y).toBeCloseTo(1, 12);
	});
});
