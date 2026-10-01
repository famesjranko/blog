export interface VortexEvent {
	x: number;
	y: number;
	age: number;
	strength: number;
	mode: "vortex-alternate" | "vortex-position";
	phase?: number;
	heldFor?: number;
	spin?: number;
}

export interface EffectOptions {
	x: number;
	y: number;
	event: VortexEvent;
	dt: number;
	aspect: number;
}

export function effect(options: EffectOptions): { x: number; y: number };
export function evolveVortices(
	events: ReadonlyArray<VortexEvent>,
	dt: number,
	aspect: number,
): VortexEvent[];
