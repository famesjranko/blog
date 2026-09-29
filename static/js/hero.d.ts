// Hand-written types for hero.js so the Node test suite can import the
// browser module without switching the compiler to check JavaScript.
// Keep in step with the JSDoc in the .js file. Only the style methods
// the function calls are typed, because Node has no DOM types.

export interface LeaveCanvas {
	style: {
		setProperty(name: string, value: string): void;
		removeProperty(name: string): string;
	};
}

export function hideFieldOnLeave(canvas: LeaveCanvas): void;
