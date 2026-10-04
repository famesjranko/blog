// Hand-written types for thought-field-orbit.js so the Node test suite
// can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { Field } from "./thought-field-particles.js";

export interface Orbit {
	press(x: number, y: number, pointerId: number): void;
	release(pointerId: number): void;
	advance(dt: number): void;
	// Share [0, 1] of hover repulsion: 0 while orbiting or fading.
	hoverShare(): number;
	stir(field: Pick<Field, "pos" | "count">, dt: number): void;
}

export function createOrbit(): Orbit;
