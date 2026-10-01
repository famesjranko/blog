import { describe, expect, it } from "vitest";
import type {
	RadialClick,
	RadialField,
	RadialForceOptions,
} from "../static/js/thought-field-click-radial.js";
import {
	attractForce,
	gatherForce,
	implodeForce,
	RADIAL_TUNING,
	shockwaveForce,
} from "../static/js/thought-field-click-radial.js";

type Force = (options: RadialForceOptions) => void;

const FRAME = 1 / 60;
const ASPECT = 1.5;
// The press point; particles sit on the line y = CY to its right, so a
// rise in x is outward and a fall is inward.
const CX = 0.2;
const CY = -0.1;

// Particles at these signed distances to the right of the press point.
function fieldAt(distances: number[]): RadialField {
	const pos = new Float32Array(distances.length * 3);
	distances.forEach((d, i) => {
		pos.set([CX + d, CY, 0], i * 3);
	});
	return { count: distances.length, pos };
}

function press(timing: Pick<RadialClick, "age" | "released">): RadialClick {
	return { x: CX, y: CY, strength: 1, ...timing };
}

function offset(field: RadialField, i: number): number {
	return (field.pos[i * 3] ?? Number.NaN) - CX;
}

// One frame of the force for the click as it is now.
function frame(force: Force, field: RadialField, click: RadialClick): void {
	force({ field, click, dt: FRAME, aspect: ASPECT });
}

// Frames of the force for `seconds`, the click ageing from `start`.
function run(
	force: Force,
	field: RadialField,
	start: RadialClick,
	seconds: number,
): void {
	const frames = Math.round(seconds / FRAME);
	for (let k = 0; k < frames; k += 1) {
		frame(force, field, { ...start, age: start.age + k * FRAME });
	}
}

describe("shockwaveForce", () => {
	it("pushes out only the particles at the ring front", () => {
		// Given a wave 0.3 s old, whose front is speed × age from the press.
		const age = 0.3;
		const front = RADIAL_TUNING.shockwave.speed * age;
		// And particles at the front, well inside it and well outside it.
		const field = fieldAt([front, front - 0.25, front + 0.25]);
		const before = Float32Array.from(field.pos);

		// When one frame of the wave runs.
		frame(shockwaveForce, field, press({ age, released: 0 }));

		// Then the particle at the front moves outward along the line.
		expect(offset(field, 0)).toBeGreaterThan(front);
		expect(field.pos[1]).toBe(before[1]);
		// And the particles inside and outside the front do not move.
		expect(field.pos.slice(3)).toEqual(before.slice(3));
	});
});

describe("gravity well", () => {
	it.each([
		["implode", implodeForce],
		["attract", attractForce],
	])("%s moves a particle toward the press point", (_name, force) => {
		// Given a particle 0.3 from a fresh tap.
		const field = fieldAt([0.3]);

		// When the well runs for half a second.
		run(force, field, press({ age: 0, released: 0 }), 0.5);

		// Then the particle is closer to the press point.
		expect(offset(field, 0)).toBeLessThan(0.3);
	});

	it("the implosion moves a particle further than attraction in the first 0.1 s", () => {
		// Given one particle 0.3 from a fresh tap for each well.
		const imploded = fieldAt([0.3]);
		const attracted = fieldAt([0.3]);

		// When each well runs for 0.1 s.
		run(implodeForce, imploded, press({ age: 0, released: 0 }), 0.1);
		run(attractForce, attracted, press({ age: 0, released: 0 }), 0.1);

		// Then the implosion has pulled its particle further in.
		const implodeIn = 0.3 - offset(imploded, 0);
		const attractIn = 0.3 - offset(attracted, 0);
		expect(implodeIn).toBeGreaterThan(attractIn);
	});

	it.each([
		["implode", implodeForce, press({ age: 0.05, released: 0 })],
		["attract", attractForce, press({ age: 0.5, released: 0 })],
		["gather while held", gatherForce, press({ age: 1, released: -1 })],
	])("%s never pulls a particle past the centre", (_name, force, click) => {
		// Given a particle 0.002 from the press point at the peak of the pull.
		const field = fieldAt([0.002]);

		// When one long 0.5 s frame of the pull runs.
		force({ field, click, dt: 0.5, aspect: ASPECT });

		// Then the particle is still on its side of the press point.
		expect(offset(field, 0)).toBeGreaterThan(0);
	});
});

describe("gatherForce", () => {
	it("pulls harder the longer the press is held", () => {
		// Given two particles 0.3 from a press, one held 0.1 s, one 1 s.
		const brief = fieldAt([0.3]);
		const long = fieldAt([0.3]);

		// When one frame of each hold runs.
		frame(gatherForce, brief, press({ age: 0.1, released: -1 }));
		frame(gatherForce, long, press({ age: 1, released: -1 }));

		// Then both move inward.
		const briefIn = 0.3 - offset(brief, 0);
		const longIn = 0.3 - offset(long, 0);
		expect(briefIn).toBeGreaterThan(0);
		// And the longer hold moves its particle further.
		expect(longIn).toBeGreaterThan(briefIn);
	});

	it("pushes outward in the frame after release", () => {
		// Given a particle 0.1 from a press held 1 s and just released.
		const field = fieldAt([0.1]);

		// When the first frame after release runs.
		frame(gatherForce, field, press({ age: 1 + FRAME, released: 1 }));

		// Then the particle moves outward.
		expect(offset(field, 0)).toBeGreaterThan(0.1);
	});

	it("bursts visibly after a 0.1 s tap", () => {
		// Given a particle 0.1 from a press released after 0.1 s.
		const field = fieldAt([0.1]);
		// And a floor of 0.04 field units, 2% of the hero height.
		const floor = 0.04;

		// When the burst runs to the end of its life.
		const start = press({ age: 0.1, released: 0.1 });
		run(gatherForce, field, start, RADIAL_TUNING.gather.life);

		// Then the particle has moved outward by more than the floor.
		expect(offset(field, 0) - 0.1).toBeGreaterThan(floor);
	});
});

// Each force at a moment it is active; `released` is when it lets go.
const FORCES: [string, Force, RadialClick, { radius: number; life: number }][] =
	[
		[
			"shockwave",
			shockwaveForce,
			press({ age: 0.7, released: 0 }),
			RADIAL_TUNING.shockwave,
		],
		[
			"implode",
			implodeForce,
			press({ age: 0.05, released: 0 }),
			RADIAL_TUNING.implode,
		],
		[
			"attract",
			attractForce,
			press({ age: 0.5, released: 0 }),
			RADIAL_TUNING.attract,
		],
		[
			"gather",
			gatherForce,
			press({ age: 1.05, released: 1 }),
			RADIAL_TUNING.gather,
		],
	];
// Particles every 0.05 from 0.05 to 0.95 from the press point.
const SPREAD = Array.from({ length: 19 }, (_, i) => 0.05 * (i + 1));

describe.each(FORCES)("%s decay", (_name, force, live, tuning) => {
	it("leaves every particle exactly still once its life is over", () => {
		// Given particles spread from the press point.
		const field = fieldAt(SPREAD);
		const before = Float32Array.from(field.pos);
		// And the same force while it is still active, as a control.
		const control = fieldAt(SPREAD);
		frame(force, control, live);
		expect(control.pos).not.toEqual(before);

		// When a frame runs just after its life since release.
		const ended = { ...live, age: live.released + tuning.life + 0.01 };
		frame(force, field, ended);

		// Then no particle has moved.
		expect(field.pos).toEqual(before);
	});

	it("leaves particles beyond its radius exactly still", () => {
		// Given one particle just inside the radius and one just outside.
		const field = fieldAt([tuning.radius - 0.05, tuning.radius + 0.01]);
		const before = Float32Array.from(field.pos);

		// When one frame of the active force runs.
		frame(force, field, live);

		// Then the particle inside the radius moves.
		expect(field.pos[0]).not.toBe(before[0]);
		// And the particle outside it does not.
		expect(field.pos.slice(3)).toEqual(before.slice(3));
	});
});
