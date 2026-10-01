export interface GatherEvent {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	phase?: "hold" | "release" | "cancel";
	heldFor?: number;
	spin?: number;
}

export interface GatherOptions {
	x: number;
	y: number;
	event: GatherEvent;
	dt: number;
	aspect: number;
}

export function effect(options: GatherOptions): { x: number; y: number };
