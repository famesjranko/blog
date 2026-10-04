// Live clicks on the hero field. A click is plain data in field space
// (x in [-aspect, aspect], y in [-1, 1], y up). Each frame the current
// mode's force moves the particles for every live click, then the clicks
// age. A click ends `life` seconds after its release, and the drift in
// stepParticles then returns the field to its normal motion. Each force
// owns its own fade over that life, so the engine keeps strength at 1:
// a fade here as well would make every force decay twice.

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
// Seconds a yielding mode takes to hand the hover back after release.
export const HOVER_RETURN = 0.6;

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
 * Whether CLICK is still in the mode's life: held, or released less
 * than LIFE seconds ago.
 * @param {Click} click
 * @param {number} life
 * @returns {boolean}
 */
function alive(click, life) {
	return click.released < 0 || click.age - click.released < life;
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
			return { ...click, age, released };
		})
		.filter((click) => alive(click, mode.life));
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
 * How much of the pointer hover to keep. A mode with `yieldHover`
 * silences it while a click is held, because the hover push would beat
 * a held pull. After release it ramps back over HOVER_RETURN, so the
 * hover does not blast a gathered knot apart. The slowest click sets
 * the pace.
 * @param {ReadonlyArray<Click>} live
 * @param {ClickMode} mode
 * @returns {number}
 */
export function hoverScale(live, mode) {
	if (mode.yieldHover !== true) {
		return 1;
	}
	let scale = 1;
	for (const click of live) {
		const back =
			click.released < 0 ? 0 : (click.age - click.released) / HOVER_RETURN;
		scale = Math.min(scale, back);
	}
	return scale;
}

/**
 * The live-click state for one hero, starting in MODE. `step` is what
 * the frame loop calls after stepParticles; `hover` scales the pointer
 * push for that frame.
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
		hover: () => hoverScale(live, mode),
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
