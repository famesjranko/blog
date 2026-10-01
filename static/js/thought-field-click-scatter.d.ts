// Hand-written types for thought-field-click-scatter.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { ForceOptions } from "./thought-field-clicks.js";

export const SCATTER_RADIUS: number;
export const SCATTER_LIFE: number;
export function scatter(options: ForceOptions): void;
