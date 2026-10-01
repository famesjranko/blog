// Hand-written types for thought-field-click-modes.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { ClickMode } from "./thought-field-clicks.js";

export const CLICK_MODES: ReadonlyArray<ClickMode>;
export const DEFAULT_MODE: string;
