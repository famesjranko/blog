import { describe, expect, it } from "vitest";
import type {
	ForceOptions,
	SwirlClick,
} from "../static/js/thought-field-click-swirl.js";
import {
	SWIRL_TUNING,
	turbulenceForce,
	vortexForce,
} from "../static/js/thought-field-click-swirl.js";

type Force = (options: ForceOptions) => void;
type Point = readonly [number, number];
type Move = { x: number; y: number };

const FRAME = 1 / 60;
const ASPECT = 1.5;
// A power of two, so x ± H is exact in the Float32 position buffer.
const H = 1 / 1024;
// A particle 0.1 to the right of and 0.075 above the default click.
const NEAR: Point = [0.35, -0.05];

function click(overrides: Partial<SwirlClick>): SwirlClick {
	return {
		x: 0.25,
		y: -0.125,
		age: 0.1,
		strength: 1,
		mode: "test",
		serial: 0,
		released: 0,
		...overrides,
	};
}

// How far one particle at POINT moves in one frame of FORCE.
function move(force: Force, at: SwirlClick, point: Point): Move {
	const pos = Float32Array.of(point[0], point[1], 0);
	const start = pos.slice();
	force({ field: { count: 1, pos }, click: at, dt: FRAME, aspect: ASPECT });
	return {
		x: (pos[0] ?? Number.NaN) - (start[0] ?? Number.NaN),
		y: (pos[1] ?? Number.NaN) - (start[1] ?? Number.NaN),
	};
}

// Points on a ring of radius R about the click, at eight headings.
function ring(at: SwirlClick, r: number): Point[] {
	return Array.from({ length: 8 }, (_, k) => {
		const heading = (k * Math.PI) / 4;
		return [at.x + r * Math.cos(heading), at.y + r * Math.sin(heading)];
	});
}

// The z component of (point − centre) × move: positive anticlockwise.
function turn(at: SwirlClick, point: Point, moved: Move): number {
	return (point[0] - at.x) * moved.y - (point[1] - at.y) * moved.x;
}

const still = (moved: Move) => moved.x === 0 && moved.y === 0;

describe("vortexForce motion", () => {
	it("moves nearby particles around the click, not toward or away from it", () => {
		// Given a fresh vortex and particles on a ring inside its core.
		const at = click({});
		const points = ring(at, 0.1);

		// When the vortex acts on each for one frame.
		const moves = points.map((point) => move(vortexForce, at, point));

		// Then each particle moves by a visible amount.
		// And at most 5 percent of each move points along the radius.
		points.forEach((point, k) => {
			const d = moves[k] ?? { x: Number.NaN, y: Number.NaN };
			const length = Math.hypot(d.x, d.y);
			const radial = (point[0] - at.x) * d.x + (point[1] - at.y) * d.y;
			expect(length).toBeGreaterThan(1e-3);
			expect(Math.abs(radial / 0.1) / length).toBeLessThan(0.05);
		});
	});

	it("turns at the Lamb–Oseen rate of a core that spreads with age", () => {
		// Given a vortex 1 s old, released at 0.5 s, and a particle 0.2 from it.
		const at = click({ age: 1, released: 0.5 });
		const point: Point = [at.x + 0.2, at.y];
		const t = SWIRL_TUNING;
		const spin = t.vortexCirculation * (1 - 0.5 / t.vortexLife) ** 2;
		const core2 = t.vortexCore ** 2 + 4 * t.vortexSpread * 1;
		const rate = (spin / (2 * Math.PI * 0.04)) * -Math.expm1(-0.04 / core2);

		// When the vortex acts for one frame.
		const moved = move(vortexForce, at, point);

		// Then the particle turns through the angle that rate gives in a frame.
		expect(Math.atan2(moved.y, 0.2 + moved.x)).toBeCloseTo(rate * FRAME, 6);
	});

	it("spins alternate clicks in opposite directions", () => {
		// Given clicks 0 and 1 at the same point.
		const first = click({ serial: 0 });
		const second = click({ serial: 1 });

		// When each click's vortex acts on the same particle.
		const turnFirst = turn(first, NEAR, move(vortexForce, first, NEAR));
		const turnSecond = turn(second, NEAR, move(vortexForce, second, NEAR));

		// Then click 0 turns it anticlockwise.
		// And click 1 turns it clockwise.
		expect(turnFirst).toBeGreaterThan(0);
		expect(turnSecond).toBeLessThan(0);
	});
});

describe("vortexForce over time", () => {
	it("weakens as it ages", () => {
		// Given a young vortex and an old one at the same point.
		const young = click({ age: 0.2 });
		const old = click({ age: 1.5 });

		// When each acts on the same particle for one frame.
		const youngMove = move(vortexForce, young, NEAR);
		const oldMove = move(vortexForce, old, NEAR);

		// Then the old vortex moves it less than half as far.
		expect(Math.hypot(oldMove.x, oldMove.y)).toBeLessThan(
			0.5 * Math.hypot(youngMove.x, youngMove.y),
		);
	});

	it("does nothing once its life after release has passed", () => {
		// Given a vortex released at 0.3 s and now one frame past its life.
		const age = 0.3 + SWIRL_TUNING.vortexLife + FRAME;
		const at = click({ released: 0.3, age });

		// When it acts for one frame on particles near its centre.
		const moves = ring(at, 0.1).map((point) => move(vortexForce, at, point));

		// Then no particle moves.
		expect(moves.every(still)).toBe(true);
	});
});

describe("turbulenceForce seeding", () => {
	it("stirs a particle the same way for the same click", () => {
		// Given two clicks with the same serial, age and place.
		const at = click({ serial: 7, age: 0.4 });

		// When each one's turbulence acts on the same particle.
		const first = move(turbulenceForce, at, NEAR);
		const second = move(turbulenceForce, { ...at }, NEAR);

		// Then the particle moves by a visible amount.
		// And both moves are the same.
		expect(Math.hypot(first.x, first.y)).toBeGreaterThan(1e-4);
		expect(second).toEqual(first);
	});

	it("stirs a particle differently for a different click", () => {
		// Given two clicks that differ only in serial.
		const first = click({ serial: 7, age: 0.4 });
		const second = click({ serial: 8, age: 0.4 });

		// When each one's turbulence acts on the same particle.
		const a = move(turbulenceForce, first, NEAR);
		const b = move(turbulenceForce, second, NEAR);

		// Then the two moves differ by more than a fifth of the larger one.
		const larger = Math.max(Math.hypot(a.x, a.y), Math.hypot(b.x, b.y));
		expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0.2 * larger);
	});
});

describe("turbulenceForce extent", () => {
	it("does nothing outside its radius", () => {
		// Given a live turbulence and particles just outside its radius.
		const at = click({ serial: 3 });
		const outside = ring(at, SWIRL_TUNING.turbulenceRadius + 0.01);

		// When it acts for one frame.
		const moves = outside.map((point) => move(turbulenceForce, at, point));

		// Then no particle moves.
		expect(moves.every(still)).toBe(true);
	});

	it("does nothing once its life after release has passed", () => {
		// Given a turbulence released at 0.3 s and now one frame past its life.
		const age = 0.3 + SWIRL_TUNING.turbulenceLife + FRAME;
		const at = click({ serial: 3, released: 0.3, age });

		// When it acts for one frame on particles near its centre.
		const moves = ring(at, 0.1).map((point) =>
			move(turbulenceForce, at, point),
		);

		// Then no particle moves.
		expect(moves.every(still)).toBe(true);
	});

	it("neither bunches nor thins the particles it stirs", () => {
		// Given a live turbulence and four particles H either side of a point.
		const at = click({ serial: 5, age: 0.6 });
		const [x, y] = NEAR;

		// When it acts on each for one frame.
		const east = move(turbulenceForce, at, [x + H, y]);
		const west = move(turbulenceForce, at, [x - H, y]);
		const north = move(turbulenceForce, at, [x, y + H]);
		const south = move(turbulenceForce, at, [x, y - H]);

		// Then the flow's divergence is under 2 percent of its shear.
		const divergence = (east.x - west.x + north.y - south.y) / (2 * H);
		const shear = Math.abs(north.x - south.x) / (2 * H);
		expect(shear).toBeGreaterThan(1e-3);
		expect(Math.abs(divergence)).toBeLessThan(0.02 * shear);
	});
});
