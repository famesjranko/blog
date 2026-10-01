// Radial click forces for the hero demo (issue #40): a shockwave ring, a
// gravity well at two speeds (a short implosion and a slow attraction),
// and press, gather, release. Each force moves particles along the line
// through the press point. The drift in stepParticles then eases them
// back to their layout, so every disturbance decays on its own. Pure
// maths, no DOM, so Node can test it directly.

/**
 * The parts of a live click and of the field that the forces read.
 * @typedef {Pick<import("./thought-field-clicks.js").Click, "x" | "y" | "age" | "strength" | "released">} RadialClick
 * @typedef {Pick<import("./thought-field-particles.js").Field, "count" | "pos">} RadialField
 * @typedef {{ field: RadialField, click: Readonly<RadialClick>, dt: number, aspect: number }} RadialForceOptions
 */

/**
 * @typedef {{ speed: number, width: number, span: number, push: number, radius: number, life: number }} ShockwaveTuning
 * @typedef {{ pull: number, core: number, radius: number, life: number }} ImplodeTuning
 * @typedef {{ pull: number, rise: number, core: number, radius: number, life: number }} AttractTuning
 * @typedef {{ pull: number, floor: number, ramp: number, core: number, radius: number, burst: number, tap: number, life: number }} GatherTuning
 * @typedef {{
 *   shockwave: Readonly<ShockwaveTuning>,
 *   implode: Readonly<ImplodeTuning>,
 *   attract: Readonly<AttractTuning>,
 *   gather: Readonly<GatherTuning>,
 * }} RadialTuning
 */

// Field units: the hero is 2 tall and 2 × aspect wide (1.3 on a phone).
// Speeds are field units/s at strength 1. The drift eases a displaced
// particle home with a ~0.9 s time constant, so a pull of v held for a
// while settles about 0.9 × v away from the layout. `life` always counts
// seconds after release; the three tap modes release at the press.
/** @type {Readonly<RadialTuning>} */
export const RADIAL_TUNING = Object.freeze({
	shockwave: Object.freeze({
		speed: 1.25, // field units/s; the ring front crosses a phone's 0.65 half-width in ~0.5 s
		width: 0.07, // field units; the front's Gaussian half-width, a thin band that reads as a ring
		span: 2.5, // widths; the front ends sharply here, so particles well inside or outside it stay still
		push: 0.9, // field units/s outward at the crest; a particle rides it ~0.1 s, so steps out ~0.06
		radius: 1, // field units; speed × life, where the front stops
		life: 0.8, // s; the crest fades as (1 - t / life)², gone as the front reaches radius
	}),
	implode: Object.freeze({
		pull: 1.6, // field units/s inward at the start; a particle 0.3 out moves ~0.07 in
		core: 0.08, // field units; inside this the pull falls off linearly, so the centre is not a point sink
		radius: 0.5, // field units; a quarter of the hero height
		life: 0.35, // s; the pull fades as (1 - t / life)², a short snap
	}),
	attract: Object.freeze({
		pull: 0.35, // field units/s inward at the peak; about a fifth of the implosion's
		rise: 0.4, // s; the pull ramps up linearly over this, so it starts gently
		core: 0.1, // field units; softened core, as for implode
		radius: 0.7, // field units; wider than implode, a slow gathering of the neighbourhood
		life: 1.8, // s; the pull fades linearly to zero at life
	}),
	gather: Object.freeze({
		pull: 0.35, // field units/s inward at full charge, the same well as attract
		floor: 0.3, // share of pull at the first frame of a hold, so a press responds at once
		ramp: 1.5, // s of holding to reach full pull and full charge
		core: 0.12, // field units; softened core, wide enough that the gathered knot stays loose
		radius: 0.6, // field units; the pull and the burst both end here
		burst: 1, // field units/s outward on release at full charge; a 1.5 s hold throws the knot ~0.15
		tap: 0.5, // least charge, so a short tap still bursts at half strength
		life: 0.45, // s; the burst fades as (1 - t / life)²
	}),
});

// Largest inward step in one frame, as a share of the distance to the
// centre. A long frame then cannot carry a particle through the centre.
const MAX_INWARD = 0.5;

// Below this distance a particle has no direction from the centre.
const NEAR = 1e-6;

/**
 * @param {number} d distance from the centre, field units
 * @param {number} radius field units
 */
function falloff(d, radius) {
	if (d >= radius) {
		return 0;
	}
	const share = 1 - (d * d) / (radius * radius);
	return share * share;
}

/**
 * Scales an inward pull down to zero at the centre, linearly inside core.
 * @param {number} d distance from the centre, field units
 * @param {number} core field units
 */
function soften(d, core) {
	return d / Math.hypot(d, core);
}

/**
 * @param {number} t seconds after release
 * @param {number} life seconds
 */
function fade(t, life) {
	if (t >= life) {
		return 0;
	}
	const share = 1 - t / life;
	return share * share;
}

/**
 * Seconds since release; seconds since the press while still held.
 * @param {RadialClick} click
 */
function sinceRelease(click) {
	return click.age - Math.max(click.released, 0);
}

/**
 * @param {RadialClick} click
 * @param {number} life seconds
 */
function expired(click, life) {
	return click.released >= 0 && click.age - click.released > life;
}

/**
 * Moves each particle along the line from the click by speed(d) × dt,
 * where d is its distance and a positive speed is outward. A particle
 * at the centre has no direction and stays put.
 * @param {{ field: RadialField, click: RadialClick, dt: number, speed: (d: number) => number }} options
 */
function moveRadially(options) {
	const { field, click, dt, speed } = options;
	const { pos } = field;
	for (let i = 0; i < field.count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - click.x;
		const dy = pos[ix + 1] - click.y;
		const d = Math.hypot(dx, dy);
		if (d > NEAR) {
			const step = speed(d) * dt * click.strength;
			const bounded = Math.max(step, -MAX_INWARD * d);
			pos[ix] += (dx / d) * bounded;
			pos[ix + 1] += (dy / d) * bounded;
		}
	}
}

/**
 * Candidate 1: a ring front leaves the press point and pushes particles
 * outward as it passes them. The ring is only seen in their motion.
 * @param {RadialForceOptions} options
 */
export function shockwaveForce(options) {
	const { field, click, dt } = options;
	const tuning = RADIAL_TUNING.shockwave;
	if (expired(click, tuning.life)) {
		return;
	}
	const front = tuning.speed * click.age;
	const crest = tuning.push * fade(sinceRelease(click), tuning.life);
	const speed = (/** @type {number} */ d) => {
		const offset = (d - front) / tuning.width;
		if (d >= tuning.radius || Math.abs(offset) > tuning.span) {
			return 0;
		}
		return crest * Math.exp(-offset * offset);
	};
	moveRadially({ field, click, dt, speed });
}

/**
 * @param {{ field: RadialField, click: RadialClick, dt: number, tuning: { core: number, radius: number }, pull: number }} options
 */
function pullInward(options) {
	const { field, click, dt, tuning, pull } = options;
	const speed = (/** @type {number} */ d) =>
		-pull * soften(d, tuning.core) * falloff(d, tuning.radius);
	moveRadially({ field, click, dt, speed });
}

/**
 * Candidate 2a: a short, strong pull toward the press point.
 * @param {RadialForceOptions} options
 */
export function implodeForce(options) {
	const { field, click, dt } = options;
	const tuning = RADIAL_TUNING.implode;
	if (expired(click, tuning.life)) {
		return;
	}
	const pull = tuning.pull * fade(sinceRelease(click), tuning.life);
	pullInward({ field, click, dt, tuning, pull });
}

/**
 * Candidate 2b: a slow, gentle pull that builds and then lets go.
 * @param {RadialForceOptions} options
 */
export function attractForce(options) {
	const { field, click, dt } = options;
	const tuning = RADIAL_TUNING.attract;
	if (expired(click, tuning.life)) {
		return;
	}
	const t = sinceRelease(click);
	const envelope =
		Math.min(1, t / tuning.rise) * Math.max(0, 1 - t / tuning.life);
	pullInward({ field, click, dt, tuning, pull: tuning.pull * envelope });
}

/**
 * Candidate 5: while held, a pull that strengthens with the hold; on
 * release, an outward burst charged by how long the press was held.
 * @param {RadialForceOptions} options
 */
export function gatherForce(options) {
	const { field, click, dt } = options;
	const tuning = RADIAL_TUNING.gather;
	if (click.released < 0) {
		const charge = Math.min(1, click.age / tuning.ramp);
		const pull = tuning.pull * (tuning.floor + (1 - tuning.floor) * charge);
		pullInward({ field, click, dt, tuning, pull });
		return;
	}
	if (expired(click, tuning.life)) {
		return;
	}
	const charge = Math.max(
		tuning.tap,
		Math.min(1, click.released / tuning.ramp),
	);
	const burst = tuning.burst * charge * fade(sinceRelease(click), tuning.life);
	const speed = (/** @type {number} */ d) => burst * falloff(d, tuning.radius);
	moveRadially({ field, click, dt, speed });
}
