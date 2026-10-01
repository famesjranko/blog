// Hand-written types for thought-field-click-panel.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

import type { ClickMode } from "./thought-field-clicks.js";

export interface PanelOptions {
	modes: ReadonlyArray<ClickMode>;
	// Why the field is off, or "" when it runs.
	reason: string;
	label: (id: string) => string;
	// Asks for the mode STEP places after FROM; 0 picks FROM itself.
	pick: (from: string, step: number) => void;
}

export function mountPanel(options: PanelOptions): {
	show: (id: string) => void;
};
export function keyPick(
	key: string,
	modes: ReadonlyArray<ClickMode>,
	current: string,
): { from: string; step: number } | null;
