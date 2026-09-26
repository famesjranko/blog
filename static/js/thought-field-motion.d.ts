// Hand-written types for thought-field-motion.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too. The
// motionSupported env and the readingFrom inputs are typed as the
// structural shapes they read, so the Node suite needs no DOM types.

import type { Vec2 } from "./thought-field-slosh.js";

// Screen axes in m/s²; spin in rad/s, positive counter-clockwise looking at the screen.
export interface MotionReading {
	x: number;
	y: number;
	spin: number;
}

export interface AccelerationReading {
	x: number | null;
	y: number | null;
}

export interface RotationReading {
	alpha: number | null;
}

export interface MotionInput {
	reading: () => MotionReading | null;
	pause: () => void;
	resume: () => void;
	destroy: () => void;
}

export interface MotionEnv {
	matchMedia: (query: string) => { matches: boolean };
	DeviceMotionEvent?: unknown;
}

export function motionSupported(env: MotionEnv): boolean;
export function toScreenAxes(sample: Vec2, angle: number): Vec2;
export function readingFrom(
	accel: AccelerationReading | null,
	rotationRate: RotationReading | null,
	angle: number,
): MotionReading | null;
export function motionInput(): MotionInput | null;
