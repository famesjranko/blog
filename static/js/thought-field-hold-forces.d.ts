import type { ClickEvent } from "./thought-field-particles.js";

export function effect(options: {
	x: number;
	y: number;
	event: Extract<
		ClickEvent,
		{ mode: "hold-pull" | "hold-push" | "hold-orbit" }
	>;
	dt: number;
	aspect: number;
}): { x: number; y: number };
