// Hand-written types for thought-field-motion.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file: the
// static typecheck resolves sibling imports to this file too. The
// motionSupported env is typed as the structural shape it reads, so the
// Node suite needs no DOM types.

import type { Vec2 } from "./thought-field-slosh.js";

export interface MotionInput {
	reading: () => Vec2 | null;
	pause: () => void;
	resume: () => void;
	destroy: () => void;
}

export interface MotionEnv {
	matchMedia: (query: string) => { matches: boolean };
	DeviceMotionEvent?: unknown;
}

export function motionSupported(env: MotionEnv): boolean;
export function motionInput(): MotionInput | null;
