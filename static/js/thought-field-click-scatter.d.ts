export interface ScatterEvent {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	phase?: number;
	heldFor?: number;
	spin?: number;
}

export interface ScatterOptions {
	x: number;
	y: number;
	event: ScatterEvent;
	dt: number;
	aspect: number;
}

export function effect(options: ScatterOptions): { x: number; y: number };
