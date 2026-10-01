// Hand-written types for thought-field-click-demo.js so the Node test
// suite can import the browser module without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file. The
// hero is typed as the structural shape listenForPresses reads, so the
// Node suite needs no DOM types.

import type {
	ClickField,
	ClickMode,
	ClickSource,
} from "./thought-field-clicks.js";

export interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

export interface PressTarget extends EventTarget {
	getBoundingClientRect(): Box;
}

// startDemo and showFieldOff take the page's hero element.
type Hero = PressTarget & {
	setAttribute(name: string, value: string): void;
};

export const DEMO_PARAM: string;
export function parseDemo(
	search: string,
	modes: ReadonlyArray<ClickMode>,
): string;
export function nextMode(
	modes: ReadonlyArray<ClickMode>,
	id: string,
	step: number,
): string;
export function demoUrl(href: string, id: string): string;
export function modeLabel(modes: ReadonlyArray<ClickMode>, id: string): string;
export function fieldPoint(
	box: Box,
	clientX: number,
	clientY: number,
): { x: number; y: number } | null;
export function listenForPresses(hero: PressTarget, clicks: ClickField): void;
export function showFieldOff(hero: Hero, reason: string): void;
export function startDemo(hero: Hero): ClickSource;
