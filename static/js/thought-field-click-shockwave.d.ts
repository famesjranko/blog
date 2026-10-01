export interface ClickEvent {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: string;
	phase?: number;
	heldFor?: number;
	spin?: number;
}

export interface EffectOptions {
	x: number;
	y: number;
	event: ClickEvent;
	dt: number;
	aspect: number;
}

export function effect(options: EffectOptions): { x: number; y: number };
