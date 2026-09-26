import { describe, expect, it } from "vitest";
import type {
	GlobeInput,
	GlobeTuning,
	SwirlStyle,
} from "../static/js/thought-field-globe.js";
import {
	GLOBE_TUNING,
	makeGlobe,
	stepGlobe,
} from "../static/js/thought-field-globe.js";

const FRAME = 1 / 60;
const ASPECT = 0.65;
const STYLES: SwirlStyle[] = ["pattern", "galaxy", "off"];

function at(values: Float32Array, index: number): number {
	return values[index] ?? Number.NaN;
}

function scatteredField(count: number) {
	return {
		count,
		pos: Float32Array.from({ length: count * 3 }, (_, i) =>
			i % 3 === 2 ? 0 : ((i * 0.37) % 2) - 1,
		),
		scale: Float32Array.from({ length: count }, (_, i) => 0.9 + (i % 10) / 11),
	};
}

// No birth jitter, so the galaxy runs are repeatable.
function styled(swirl: SwirlStyle): GlobeTuning {
	return {
		...GLOBE_TUNING,
		swirl,
		galaxy: { ...GLOBE_TUNING.galaxy, jitter: 0 },
	};
}

// 12 m/s² sideways at 3 Hz for half a second, then still.
function firmShake(t: number): GlobeInput {
	const shake = t < 0.5 ? 12 * Math.sin(2 * Math.PI * 3 * t) : 0;
	return { shake: { x: shake, y: 0 }, lean: { x: 0, y: 0 } };
}

describe("stepGlobe", () => {
	it("defaults to the galaxy swirl", () => {
		expect(GLOBE_TUNING.swirl).toBe("galaxy");
	});

	it.each(STYLES)("%s: scatters on a firm shake, then settles", (style) => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const tuning = styled(style);
		let step = { globe: makeGlobe(field.count), hold: 1 };
		for (let frame = 0; frame < 60 * 7; frame += 1) {
			const time = frame * FRAME;
			const { globe } = step;
			const input = firmShake(time);
			const dt = FRAME;
			const aspect = ASPECT;
			step = stepGlobe({ globe, field, input, dt, time, aspect, tuning });
		}
		const moved = Array.from(field.pos, (v, i) => Math.abs(v - at(start, i)));
		expect(Math.max(...moved)).toBeGreaterThan(0.1);
		expect(Math.max(...moved)).toBeLessThan(1.5);
		expect(step.hold).toBeGreaterThan(0.99);
		const speeds = Array.from(step.globe.vel, Math.abs);
		expect(Math.max(...speeds)).toBeLessThan(0.01);
	});

	it.each(STYLES)("%s: leans without stirring on a tilt", (style) => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const tuning = styled(style);
		let step = { globe: makeGlobe(field.count), hold: 1 };
		const input: GlobeInput = {
			shake: { x: 0, y: 0 },
			lean: { x: 0.05, y: 0 },
		};
		for (let frame = 0; frame < 60 * 2; frame += 1) {
			const time = frame * FRAME;
			const { globe } = step;
			const dt = FRAME;
			const aspect = ASPECT;
			step = stepGlobe({ globe, field, input, dt, time, aspect, tuning });
		}
		const drift = Array.from(field.pos, (v, i) => v - at(start, i));
		expect(Math.min(...drift.filter((_, i) => i % 3 === 0))).toBeGreaterThan(0);
		expect(step.globe.energy).toBe(0);
		expect(step.globe.galaxy.wells).toHaveLength(0);
		expect(step.hold).toBe(1);
	});
});

describe("stepGlobe swirl styles", () => {
	it("galaxy: loosens the hold while its vortices swirl", () => {
		const field = scatteredField(40);
		const tuning = styled("galaxy");
		let step = { globe: makeGlobe(field.count), hold: 1 };
		let loosest = 1;
		for (let frame = 0; frame < 60; frame += 1) {
			const time = frame * FRAME;
			const { globe } = step;
			const input = firmShake(time);
			const dt = FRAME;
			const aspect = ASPECT;
			step = stepGlobe({ globe, field, input, dt, time, aspect, tuning });
			loosest = Math.min(loosest, step.hold);
		}
		expect(step.globe.galaxy.wells.length).toBeGreaterThan(0);
		expect(loosest).toBeLessThan(0.6);
	});

	it("off: the shake still jolts the particles, but there is no flow", () => {
		const field = scatteredField(40);
		const start = Float32Array.from(field.pos);
		const tuning = styled("off");
		let step = { globe: makeGlobe(field.count), hold: 1 };
		for (let frame = 0; frame < 30; frame += 1) {
			const time = frame * FRAME;
			const { globe } = step;
			const input = firmShake(time);
			const dt = FRAME;
			const aspect = ASPECT;
			step = stepGlobe({ globe, field, input, dt, time, aspect, tuning });
		}
		const moved = Array.from(field.pos, (v, i) => Math.abs(v - at(start, i)));
		expect(Math.max(...moved)).toBeGreaterThan(0.01);
		expect(Array.from(step.globe.flow).every((v) => v === 0)).toBe(true);
		expect(step.hold).toBe(1);
	});
});
