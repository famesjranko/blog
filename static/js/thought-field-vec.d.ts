// Hand-written types for thought-field-vec.js so the Node test suite
// can import the browser modules without switching the compiler to
// check JavaScript. Keep in step with the JSDoc in the .js file.

export interface Vec2 {
	x: number;
	y: number;
}

export function vec(x: number, y: number): Vec2;
export function add(a: Vec2, b: Vec2): Vec2;
export function sub(a: Vec2, b: Vec2): Vec2;
export function scaled(v: Vec2, k: number): Vec2;
export function dot(a: Vec2, b: Vec2): number;
export function cross(a: Vec2, b: Vec2): number;
