// Press and hold on the hero field: nearby particles circle the press
// point clockwise. On release the orbit fades over a short tail, then
// hover repulsion ramps back in. The state is one object written in
// place, so a frame allocates nothing.

/** @typedef {import("./thought-field-particles.js").Field} Field */

// Times are in seconds, distances in field units. A hold still pressed
// at `cap` fades as if released, in case its pointerup never arrives.
const TUNING = Object.freeze({
	radius: 0.65,
	speed: 2.4,
	maxStep: 0.03,
	rampIn: 0.5,
	cap: 4,
	tail: 0.25,
	hoverRamp: 0.5,
});

/**
 * `idle`: nothing. `hold`: pressed, orbiting. `fade`: released, the
 * orbit falls to zero. `resume`: no orbit, hover repulsion ramps back.
 * @typedef {"idle" | "hold" | "fade" | "resume"} OrbitPhase
 * @typedef {Exclude<OrbitPhase, "idle">} TimedPhase
 */

/**
 * AGE is seconds in the current phase. FROM is the strength when the
 * phase began, so a fade starts where the hold left off and a press
 * in the fade starts where the fade had got to.
 * @typedef {{ phase: OrbitPhase, x: number, y: number, pointerId: number,
 *   age: number, from: number }} OrbitState
 */

/** @type {Readonly<Record<TimedPhase, number>>} */
const LENGTH = {
	hold: TUNING.cap,
	fade: TUNING.tail,
	resume: TUNING.hoverRamp,
};

/** @type {Readonly<Record<TimedPhase, OrbitPhase>>} */
const NEXT = { hold: "fade", fade: "resume", resume: "idle" };

/**
 * @typedef {{
 *   press: (x: number, y: number, pointerId: number) => void,
 *   release: (pointerId: number) => void,
 *   advance: (dt: number) => void,
 *   hoverShare: () => number,
 *   stir: (field: Field, dt: number) => void,
 * }} Orbit
 */

/** @returns {Orbit} */
export function createOrbit() {
	/** @type {OrbitState} */
	const state = { phase: "idle", x: 0, y: 0, pointerId: -1, age: 0, from: 0 };
	/** @param {OrbitPhase} phase */
	const enter = (phase) => {
		state.from = strength(state);
		state.phase = phase;
		state.age = 0;
	};
	return {
		press: (x, y, pointerId) => {
			if (state.phase !== "hold") {
				enter("hold");
				state.x = x;
				state.y = y;
				state.pointerId = pointerId;
			}
		},
		release: (pointerId) => {
			if (state.phase === "hold" && pointerId === state.pointerId) {
				enter("fade");
			}
		},
		advance: (dt) => {
			if (state.phase === "idle") {
				return;
			}
			state.age += dt;
			if (state.age >= LENGTH[state.phase]) {
				enter(NEXT[state.phase]);
			}
		},
		hoverShare: () => hoverShare(state),
		stir: (field, dt) => {
			const share = strength(state);
			if (share > 0) {
				// A long frame would fling particles off their circle.
				turn(field, state, share * Math.min(dt, 1 / 30));
			}
		},
	};
}

/**
 * The orbit's strength: it builds over `rampIn` while held, then falls
 * linearly to zero over the tail.
 * @param {Readonly<OrbitState>} state
 * @returns {number}
 */
function strength(state) {
	if (state.phase === "hold") {
		// A press in the fade carries on from the strength it caught.
		const start = Math.max(0.1, state.from);
		return start + (1 - start) * Math.min(state.age / TUNING.rampIn, 1);
	}
	if (state.phase === "fade") {
		return state.from * (1 - state.age / TUNING.tail);
	}
	return 0;
}

/**
 * Share of hover repulsion: none while the orbit runs, then a linear
 * ramp back to whole.
 * @param {Readonly<OrbitState>} state
 * @returns {number}
 */
function hoverShare(state) {
	if (state.phase === "idle") {
		return 1;
	}
	return state.phase === "resume" ? state.age / TUNING.hoverRamp : 0;
}

/**
 * Moves every particle within the radius a step clockwise around
 * CENTRE, in place. GAIN is strength times the frame's seconds. Plain
 * arguments, not an options object, so the frame allocates nothing.
 * @param {Field} field
 * @param {{ x: number, y: number }} centre
 * @param {number} gain
 */
function turn(field, centre, gain) {
	const { pos, count } = field;
	const { radius, speed, maxStep } = TUNING;
	const cx = centre.x;
	const cy = centre.y;
	const scale = speed * gain;
	for (let i = 0; i < count; i += 1) {
		const ix = i * 3;
		const dx = pos[ix] - cx;
		const dy = pos[ix + 1] - cy;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (distance === 0 || distance >= radius) {
			continue;
		}
		const falloff = (1 - distance / radius) ** 2;
		const step = Math.min(maxStep, scale * falloff) / distance;
		// Field y points up, so (dy, -dx) is the clockwise tangent.
		pos[ix] += dy * step;
		pos[ix + 1] -= dx * step;
	}
}
