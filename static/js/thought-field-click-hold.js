// Click-and-hold forces for the hero demo (issue #40): a well that pulls
// harder the longer the press, a bloom that clears a widening hole, and a
// swirl that builds speed. Each one holds at full strength while the press
// is held and owns its own fade after release. The drift in stepParticles
// then eases the particles back to their layout. Pure maths, no DOM, so
// Node can test it directly.

import { fade, falloff, soften } from "./thought-field-click-radial.js";

/**
 * @typedef {import("./thought-field-click-radial.js").RadialClick} HoldClick
 * @typedef {import("./thought-field-click-radial.js").RadialField} HoldField
 * @typedef {import("./thought-field-click-radial.js").RadialForceOptions} HoldForceOptions
 */

/**
 * @typedef {{ pull: number, floor: number, ramp: number, core: number, radius: number, life: number }} WellTuning
 * @typedef {{ push: number, from: number, to: number, grow: number, life: number }} BloomTuning
 * @typedef {{ speed: number, ramp: number, core: number, radius: number, life: number }} SpinTuning
 * @typedef {{ well: Readonly<WellTuning>, bloom: Readonly<BloomTuning>, spin: Readonly<SpinTuning> }} HoldTuning
 */

// Field units and seconds, as in RADIAL_TUNING. `life` counts seconds
// after release.
/** @type {Readonly<HoldTuning>} */
export const HOLD_TUNING = Object.freeze({
	well: Object.freeze({
		pull: 0.6, // field units/s inward at full charge; about twice Gather's, so a hold is clearly seen
		floor: 0.3, // share of pull at the first frame, so a press responds at once
		ramp: 1.2, // s of holding to reach full pull
		core: 0.1, // field units; softened core, so the centre is not a point sink
		radius: 0.6, // field units; the pull ends here
		life: 0.6, // s; the pull lets go as (1 - t / life)², with no outward burst
	}),
	bloom: Object.freeze({
		push: 1, // field units/s outward at the press; a particle near the press leaves it quickly
		from: 0.2, // field units; the reach at the first frame, a small hole
		to: 0.6, // field units; the reach after `grow`, matching the well's radius
		grow: 2, // s of holding for the reach to widen from `from` to `to`
		life: 0.6, // s; the push fades as (1 - t / life)²
	}),
	spin: Object.freeze({
		speed: 0.6, // field units/s around the press at full speed; a particle 0.3 out turns ~2 rad/s
		ramp: 1.5, // s of holding to reach full speed
		core: 0.12, // field units; softened core, so particles near the press do not whip round
		radius: 0.6, // field units; the swirl ends here
		life: 1.5, // s; the swirl coasts down as (1 - t / life)², a long, flywheel-like stop
	}),
});

// Largest inward step in one frame, as a share of the distance to the
// press. A long frame then cannot carry a particle through the press.
const MAX_INWARD = 0.5;

// Below this distance a particle has no direction from the press.
const NEAR = 1e-6;

/**
 * Seconds the press has been held: the age while held, the hold length after.
 * @param {HoldClick} click
 */
function held(click) {
	return click.released >= 0 ? click.released : click.age;
}

/**
 * Share of the force left: full while held, fading after release.
 * @param {HoldClick} click
 * @param {number} life seconds
 */
function envelope(click, life) {
	return click.released >= 0 ? fade(click.age - click.released, life) : 1;
}

/**
 * Share of a build-up reached after the hold, 0 to 1.
 * @param {HoldClick} click
 * @param {number} ramp seconds
 */
function charge(click, ramp) {
	return Math.min(1, held(click) / ramp);
}

/**
 * Moves each particle about the press. `motion(d)` gives the speeds at
 * distance d: radial (positive is outward) and swirl (positive is
 * counter-clockwise). The swirl turns the particle by an angle, so it
 * keeps its distance. A particle at the press has no direction and stays.
 * @param {{ field: HoldField, click: HoldClick, dt: number, motion: (d: number) => { radial: number, swirl: number } }} options
 */
function displace(options) {
	const { field, click, dt, motion } = options;
	const { pos } = field;
	for (let i = 0; i < field.count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - click.x;
		const dy = pos[ix + 1] - click.y;
		const d = Math.hypot(dx, dy);
		if (d <= NEAR) {
			continue;
		}
		const { radial, swirl } = motion(d);
		const reach = Math.max(
			d + radial * dt * click.strength,
			(1 - MAX_INWARD) * d,
		);
		const angle = (swirl * dt * click.strength) / d;
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		const scale = reach / d;
		pos[ix] = click.x + scale * (dx * cos - dy * sin);
		pos[ix + 1] = click.y + scale * (dx * sin + dy * cos);
	}
}

/**
 * Well: an inward pull that strengthens over the hold, then lets go.
 * @param {HoldForceOptions} options
 */
export function wellForce(options) {
	const { field, click, dt } = options;
	const tuning = HOLD_TUNING.well;
	const build = tuning.floor + (1 - tuning.floor) * charge(click, tuning.ramp);
	const pull = tuning.pull * build * envelope(click, tuning.life);
	const motion = (/** @type {number} */ d) => ({
		radial: -pull * soften(d, tuning.core) * falloff(d, tuning.radius),
		swirl: 0,
	});
	displace({ field, click, dt, motion });
}

/**
 * Bloom: an outward push whose reach widens over the hold, then fades.
 * @param {HoldForceOptions} options
 */
export function bloomForce(options) {
	const { field, click, dt } = options;
	const tuning = HOLD_TUNING.bloom;
	const reach =
		tuning.from + (tuning.to - tuning.from) * charge(click, tuning.grow);
	const push = tuning.push * envelope(click, tuning.life);
	const motion = (/** @type {number} */ d) => ({
		radial: push * falloff(d, reach),
		swirl: 0,
	});
	displace({ field, click, dt, motion });
}

/**
 * Spin: a counter-clockwise swirl that speeds up over the hold and coasts
 * to a stop after release.
 * @param {HoldForceOptions} options
 */
export function spinForce(options) {
	const { field, click, dt } = options;
	const tuning = HOLD_TUNING.spin;
	const speed =
		tuning.speed * charge(click, tuning.ramp) * envelope(click, tuning.life);
	const motion = (/** @type {number} */ d) => ({
		radial: 0,
		swirl: speed * soften(d, tuning.core) * falloff(d, tuning.radius),
	});
	displace({ field, click, dt, motion });
}
