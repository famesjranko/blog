// Hand-written types for thought-field-orbit-input.js so the Node test
// suite can import the browser module. Keep in step with the JSDoc in
// the .js file. The hero is typed as the structural shape the module
// reads, so the Node suite needs no DOM types.

import type { Orbit } from "./thought-field-orbit.js";

export interface OrbitHero
	extends Pick<EventTarget, "addEventListener" | "removeEventListener"> {
	getBoundingClientRect(): {
		left: number;
		top: number;
		width: number;
		height: number;
	};
}

export function listenForOrbit(hero: OrbitHero, orbit: Orbit): () => void;
