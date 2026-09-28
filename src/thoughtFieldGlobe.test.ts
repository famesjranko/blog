import { describe, expect, it } from "vitest";
import type { Globe, GlobeTuning } from "../static/js/thought-field-globe.js";
import {
	GLOBE_TUNING,
	makeGlobe,
	reseedGlobe,
	stepGlobe,
} from "../static/js/thought-field-globe.js";
import type { Vec2 } from "../static/js/thought-field-vec.js";

const G = 9.81;
const ASPECT = 0.65;
// Portrait, held upright: the reading points up the screen at 1 g.
const UPRIGHT: Vec2 = { x: 0, y: G };
// No birth jitter, so every run is repeatable.
const TUNING: GlobeTuning = {
	...GLOBE_TUNING,
	galaxy: { ...GLOBE_TUNING.galaxy, jitter: 0 },
};
const SHAKE_START = 0.5;
const SHAKE_END = 1.2;

type Field = ReturnType<typeof scatteredField>;
type Reading = (t: number) => Vec2 | null;

function scatteredField(count: number) {
	return {
		count,
		pos: Float32Array.from({ length: count * 3 }, (_, i) =>
			i % 3 === 2 ? 0 : ((i * 0.37) % 2) - 1,
		),
		scale: Float32Array.from({ length: count }, (_, i) => 0.9 + (i % 10) / 11),
	};
}

// Upright, then 15 m/s² sideways at 3 Hz for 0.7 s, then upright again.
function firmShake(t: number): Vec2 {
	const shaking = t >= SHAKE_START && t < SHAKE_END;
	const x = shaking ? 15 * Math.sin(2 * Math.PI * 3 * (t - SHAKE_START)) : 0;
	return { x, y: G };
}

interface RunOptions {
	field: Field;
	reading: Reading;
	seconds: number;
	fps?: number;
	globe?: Globe;
}

// Steps the globe at a steady frame rate, reading once per frame.
function run(options: RunOptions): { globe: Globe; holds: number[] } {
	const { field, reading, seconds, fps = 60 } = options;
	const dt = 1 / fps;
	const holds: number[] = [];
	let globe = options.globe ?? makeGlobe(field.count);
	for (let frame = 1; frame <= Math.round(seconds * fps); frame += 1) {
		const sample = reading(frame * dt);
		const aspect = ASPECT;
		const tuning = TUNING;
		const step = stepGlobe({ globe, field, sample, dt, aspect, tuning });
		globe = step.globe;
		holds.push(step.hold);
	}
	return { globe, holds };
}

function displacements(field: Field, start: Float32Array): number[] {
	return Array.from({ length: field.count }, (_, i) =>
		Math.hypot(
			(field.pos[i * 3] ?? 0) - (start[i * 3] ?? 0),
			(field.pos[i * 3 + 1] ?? 0) - (start[i * 3 + 1] ?? 0),
		),
	);
}

function mean(values: number[]): number {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe("stepGlobe shake", () => {
	it("scatters the particles on a firm shake, then settles them", () => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const { globe, holds } = run({ field, reading: firmShake, seconds: 8 });
		const moved = displacements(field, start);
		expect(Math.max(...moved)).toBeGreaterThan(0.1);
		expect(Math.max(...moved)).toBeLessThan(1.5);
		expect(Math.min(...holds)).toBeLessThan(0.6);
		expect(holds.at(-1)).toBeGreaterThan(0.99);
		expect(globe.galaxy.wells).toHaveLength(0);
		expect(Math.max(...Array.from(globe.vel, Math.abs))).toBeLessThan(0.01);
	});

	it.each([30, 60, 144])(
		"scatters the particles as far at %d fps as at 120 fps",
		(fps) => {
			// Mean displacement half a second after the shake stops.
			const scatterAt = (rate: number) => {
				const field = scatteredField(40);
				const start = Float32Array.from(field.pos);
				const seconds = SHAKE_END + 0.5;
				run({ field, reading: firmShake, seconds, fps: rate });
				return mean(displacements(field, start));
			};
			const reference = scatterAt(120);
			expect(reference).toBeGreaterThan(0.05);
			expect(scatterAt(fps) / reference).toBeCloseTo(1, 1);
		},
	);
});

describe("stepGlobe tilt", () => {
	it("sinks the particles toward a lowered edge without stirring", () => {
		// Right edge lowered 30°: the reading's x is -g sin 30°.
		const rightDown = { x: -G * 0.5, y: G * Math.cos(Math.PI / 6) };
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const reading = (t: number) => (t < 0.5 ? UPRIGHT : rightDown);
		const { globe, holds } = run({ field, reading, seconds: 2 });
		const drift = Array.from(field.pos, (v, i) => v - (start[i] ?? 0));
		expect(Math.min(...drift.filter((_, i) => i % 3 === 0))).toBeGreaterThan(0);
		expect(globe.galaxy.wells).toHaveLength(0);
		expect(Math.min(...holds)).toBe(1);
	});
});

describe("stepGlobe seeding", () => {
	it("takes the first reading from a tilted phone as neutral: no kick, no lean", () => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		run({ field, reading: () => ({ x: 3, y: 9 }), seconds: 1 });
		expect(field.pos).toEqual(start);
	});

	it("carries on without a kick when resumed at a new angle", () => {
		const field = scatteredField(40);
		const upright = run({ field, reading: () => UPRIGHT, seconds: 1 });
		const start = Float32Array.from(field.pos);
		const globe = reseedGlobe(upright.globe);
		run({ field, reading: () => ({ x: 5, y: 8 }), seconds: 1, globe });
		expect(field.pos).toEqual(start);
	});
});

describe("stepGlobe idle", () => {
	it("keeps a resting globe still without readings", () => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const { holds } = run({ field, reading: () => null, seconds: 1 });
		expect(field.pos).toEqual(start);
		expect(Math.min(...holds)).toBe(1);
	});

	it.each([0, -1])("returns the globe untouched when dt is %d", (dt) => {
		const field = scatteredField(40);
		const shaken = run({ field, reading: firmShake, seconds: 0.8 }).globe;
		const start = Float32Array.from(field.pos);
		const vel = Float32Array.from(shaken.vel);
		const sample = { x: 20, y: G };
		const aspect = ASPECT;
		const tuning = TUNING;
		const step = stepGlobe({
			globe: shaken,
			field,
			sample,
			dt,
			aspect,
			tuning,
		});
		expect(step.globe).toBe(shaken);
		expect(field.pos).toEqual(start);
		expect(shaken.vel).toEqual(vel);
		expect(step.hold).toBeLessThan(1);
	});
});
