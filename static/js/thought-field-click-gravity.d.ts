export interface GravityEvent {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	phase?: number;
	heldFor?: number;
	spin?: number;
}

export interface GravityOptions {
	x: number;
	y: number;
	event: GravityEvent;
	dt: number;
	aspect: number;
}

export function effect(options: GravityOptions): { x: number; y: number };
