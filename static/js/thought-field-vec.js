// 2D vector arithmetic shared by the motion filter and the slosh spring.
// Every function returns a new vector and leaves its arguments alone.

/** @typedef {{ x: number, y: number }} Vec2 */

/** @type {(x: number, y: number) => Vec2} */
export const vec = (x, y) => ({ x, y });

/** @type {(a: Vec2, b: Vec2) => Vec2} */
export const add = (a, b) => vec(a.x + b.x, a.y + b.y);

/** @type {(a: Vec2, b: Vec2) => Vec2} */
export const sub = (a, b) => vec(a.x - b.x, a.y - b.y);

/** @type {(v: Vec2, k: number) => Vec2} */
export const scaled = (v, k) => vec(v.x * k, v.y * k);
