// Live clicks on the hero field. A click is plain data in field space
// (x in [-aspect, aspect], y in [-1, 1], y up). Each frame the current
// mode's force moves the particles for every live click, then the clicks
// age. A click ends `life` seconds after its release, and the drift in
// stepParticles then returns the field to its normal motion.

/**
 * @typedef {import("./thought-field-clicks.js").Click} Click
 * @typedef {import("./thought-field-clicks.js").ClickMode} ClickMode
 * @typedef {import("./thought-field-clicks.js").ClickField} ClickField
 * @typedef {import("./thought-field-clicks.js").StepOptions} StepOptions
 */

export const MAX_LIVE = 8;
// A press held this long is released, so a lost pointerup cannot pin a
// click to the field.
export const HOLD_LIMIT = 4;

/**
 * Adds a click at (X, Y). A mode without `hold` releases it at once.
 * The oldest click is dropped to keep at most MAX_LIVE.
 * @param {ReadonlyArray<Click>} live
 * @param {{ x: number, y: number, mode: ClickMode, serial: number }} press
 * @returns {Click[]}
 */
export function pressClick(live, press) {
	const { x, y, mode, serial } = press;
	const released = mode.hold ? -1 : 0;
	const click = { x, y, age: 0, strength: 1, mode: mode.id, serial, released };
	return [...live, click].slice(-MAX_LIVE);
}

/**
 * Marks the held click SERIAL as released at its current age.
 * @param {ReadonlyArray<Click>} live
 * @param {number} serial
 * @returns {Click[]}
 */
export function releaseClick(live, serial) {
	return live.map((click) =>
		click.serial === serial && click.released < 0
			? { ...click, released: click.age }
			: click,
	);
}

/**
 * Strength is 1 while held, then falls linearly to 0 over the mode's life.
 * @param {Click} click
 * @param {number} life
 * @returns {number}
 */
function envelope(click, life) {
	if (click.released < 0) {
		return 1;
	}
	if (life <= 0) {
		return 0;
	}
	return Math.max(0, 1 - (click.age - click.released) / life);
}

/**
 * Ages every click by DT, releases presses held past HOLD_LIMIT, and
 * drops clicks whose life after release has ended.
 * @param {ReadonlyArray<Click>} live
 * @param {ClickMode} mode
 * @param {number} dt
 * @returns {Click[]}
 */
export function advanceClicks(live, mode, dt) {
	return live
		.map((click) => {
			const age = click.age + dt;
			const held = click.released < 0 && age < HOLD_LIMIT;
			const released = held || click.released >= 0 ? click.released : age;
			const aged = { ...click, age, released };
			return { ...aged, strength: envelope(aged, mode.life) };
		})
		.filter((click) => click.released < 0 || click.strength > 0);
}

/**
 * Applies MODE's force for every live click to the field.
 * @param {StepOptions & { live: ReadonlyArray<Click>, mode: ClickMode }} options
 */
export function applyClicks(options) {
	const { field, dt, aspect, live, mode } = options;
	for (const click of live) {
		mode.force({ field, click, dt, aspect });
	}
}

/**
 * The live-click state for one hero, starting in MODE. `step` is what
 * the frame loop calls after stepParticles.
 * @param {ClickMode} initial
 * @returns {ClickField}
 */
export function createClicks(initial) {
	let mode = initial;
	/** @type {Click[]} */
	let live = [];
	let serial = 0;
	return {
		mode: () => mode,
		live: () => live,
		press: (x, y) => {
			serial += 1;
			live = pressClick(live, { x, y, mode, serial });
			return serial;
		},
		release: (pressed) => {
			live = releaseClick(live, pressed);
		},
		setMode: (next) => {
			mode = next;
			live = [];
		},
		step: ({ field, dt, aspect }) => {
			applyClicks({ field, dt, aspect, live, mode });
			live = advanceClicks(live, mode, dt);
		},
	};
}
