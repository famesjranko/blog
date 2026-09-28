import { describe, expect, it } from "vitest";
import type {
	GalaxyState,
	GalaxyTuning,
	Well,
} from "../static/js/thought-field-galaxy.js";
import {
	GALAXY_TUNING,
	addGalaxyFlow,
	galaxyAgitation,
	makeGalaxy,
	stepGalaxy,
} from "../static/js/thought-field-galaxy.js";
import type { Vec2 } from "../static/js/thought-field-vec.js";

const FRAME = 1 / 60;
const ASPECT = 0.65;
const STILL: Vec2 = { x: 0, y: 0 };
// A power of two, so x ± H is exact in the Float32 position buffer.
const H = 1 / 1024;
// Around each centre: +x, -x, +y, -y.
const NEIGHBOURS = [
	[H, 0],
	[-H, 0],
	[0, H],
	[0, -H],
] as const;

type Shake = (t: number) => Vec2;

function run(options: {
	state: GalaxyState;
	shake: Shake;
	seconds: number;
	tuning: GalaxyTuning;
	aspect?: number;
}): GalaxyState {
	const { shake, seconds, tuning, aspect = ASPECT } = options;
	let state = options.state;
	for (let frame = 0; frame < Math.round(seconds / FRAME); frame += 1) {
		const dt = FRAME;
		state = stepGalaxy({
			state,
			shake: shake(frame * FRAME),
			dt,
			tuning,
			aspect,
		});
	}
	return state;
}

// Steps a steady shake until the first pair is born.
function firstPair(direction: Vec2, tuning: GalaxyTuning, aspect = ASPECT) {
	const shake = { x: 15 * direction.x, y: 15 * direction.y };
	let state = makeGalaxy();
	for (let frame = 0; frame < 60 && state.wells.length === 0; frame += 1) {
		state = stepGalaxy({ state, shake, dt: FRAME, tuning, aspect });
	}
	const [a, b] = state.wells;
	if (a === undefined || b === undefined) {
		throw new Error("no pair was born");
	}
	return { state, a, b };
}

function flowAt(state: GalaxyState, points: number[][], tuning: GalaxyTuning) {
	const pos = Float32Array.from(points.flatMap(([x = 0, y = 0]) => [x, y, 0]));
	const flow = new Float32Array(points.length * 2);
	addGalaxyFlow({ state, pos, flow, count: points.length, tuning });
	return flow;
}

function at(values: Float32Array, index: number): number {
	return values[index] ?? Number.NaN;
}

function grid(): number[][] {
	const out: number[][] = [];
	for (let x = -0.75; x <= 0.75; x += 0.125) {
		for (let y = -1; y <= 1; y += 0.125) {
			out.push([x, y]);
		}
	}
	return out;
}

const wellsState = (wells: Well[]): GalaxyState => ({ ...makeGalaxy(), wells });
const midpoint = (a: Well, b: Well) => [(a.x + b.x) / 2, (a.y + b.y) / 2];

describe("stepGalaxy spawning", () => {
	it.each([
		["right", { x: 1, y: 0 }],
		["left", { x: -1, y: 0 }],
		["up", { x: 0, y: 1 }],
		["down", { x: 0, y: -1 }],
	])(
		"a %s shake drives the flow between the pair the opposite way",
		(_, dir) => {
			const tuning = GALAXY_TUNING;
			const { state, a, b } = firstPair(dir, tuning);
			const flow = flowAt(state, [midpoint(a, b)], tuning);
			const spacing = Math.hypot(a.x - b.x, a.y - b.y);
			const r2 = (spacing / 2) ** 2;
			// Two Lamb–Oseen cores, each Γ(1 − e^(−r²/a²)) / (2πr) at r = s/2.
			const expected =
				(2 * Math.abs(a.spin) * (1 - Math.exp(-r2 / a.core2))) /
				(Math.PI * spacing);
			const along = at(flow, 0) * dir.x + at(flow, 1) * dir.y;
			const across = at(flow, 0) * dir.y - at(flow, 1) * dir.x;
			expect(a.spin + b.spin).toBe(0);
			expect(along).toBeCloseTo(-expected, 4);
			expect(Math.abs(across)).toBeLessThan(1e-4);
		},
	);

	it("births nothing, and no flow, without a shake", () => {
		const tuning = GALAXY_TUNING;
		const points = grid();
		let state = makeGalaxy();
		let born = 0;
		let stirred = 0;
		for (let frame = 0; frame < 60 * 5; frame += 1) {
			const dt = FRAME;
			const aspect = ASPECT;
			state = stepGalaxy({ state, shake: STILL, dt, tuning, aspect });
			born = Math.max(born, state.wells.length);
			const flow = flowAt(state, points, tuning);
			stirred = Math.max(stirred, ...Array.from(flow, Math.abs));
		}
		expect(born).toBe(0);
		expect(stirred).toBe(0);
		expect(galaxyAgitation(state, tuning)).toBe(0);
	});
});

describe("stepGalaxy birth rate", () => {
	it("sheds a few pairs over one firm shake, not dozens", () => {
		const tuning = { ...GALAXY_TUNING, maxWells: 100 };
		const seconds = 0.7;
		let state = makeGalaxy();
		let pairs = 0;
		for (let frame = 0; frame < Math.round(seconds / FRAME); frame += 1) {
			// A firm sideways shake as the deadzone passes it: 10 m/s² at 3 Hz.
			const shake = { x: 10 * Math.sin(2 * Math.PI * 3 * frame * FRAME), y: 0 };
			state = stepGalaxy({ state, shake, dt: FRAME, tuning, aspect: ASPECT });
			pairs += state.wells.filter((well) => well.age === 0).length / 2;
		}
		expect(pairs).toBeGreaterThanOrEqual(2);
		expect(pairs).toBeLessThanOrEqual(
			1 + Math.floor(seconds / tuning.cooldown),
		);
	});

	it.each([8, 3])(
		"keeps at most %i wells under a long violent shake",
		(max) => {
			const tuning = { ...GALAXY_TUNING, maxWells: max };
			let state = makeGalaxy();
			let peak = 0;
			for (let frame = 0; frame < 60 * 10; frame += 1) {
				const t = frame * FRAME;
				// 30 m/s² whose direction turns at 1 Hz.
				const shake = {
					x: 30 * Math.cos(2 * Math.PI * t),
					y: 30 * Math.sin(2 * Math.PI * t),
				};
				state = stepGalaxy({ state, shake, dt: FRAME, tuning, aspect: ASPECT });
				peak = Math.max(peak, state.wells.length);
			}
			expect(peak).toBe(max);
		},
	);
});

describe("stepGalaxy fading", () => {
	it("fades to nothing within five decay periods of the shake stopping", () => {
		const tuning = GALAXY_TUNING;
		const shaken = run({
			state: makeGalaxy(),
			// A firm sideways shake as the deadzone passes it: 10 m/s² at 3 Hz.
			shake: (t) => ({ x: 10 * Math.sin(2 * Math.PI * 3 * t), y: 0 }),
			seconds: 0.7,
			tuning,
		});
		expect(shaken.wells.length).toBeGreaterThan(1);
		expect(galaxyAgitation(shaken, tuning)).toBeGreaterThan(0.3);
		const calm = run({
			state: shaken,
			shake: () => STILL,
			seconds: 5 * tuning.decay,
			tuning,
		});
		expect(calm.wells).toHaveLength(0);
		expect(galaxyAgitation(calm, tuning)).toBe(0);
	});
});

describe("stepGalaxy vortex dynamics", () => {
	it("glides a lone pair the way its jet points, at the pair speed", () => {
		// Steady wells, far side walls: only the pair and the top and bottom walls act.
		const tuning = {
			...GALAXY_TUNING,
			jitter: 0,
			spacing: 0.2,
			core: 0.05,
			decay: 1e9,
			spread: 0,
		};
		const aspect = 10;
		const { state, a, b } = firstPair({ x: 1, y: 0 }, tuning, aspect);
		const seconds = 0.5;
		const later = run({ state, shake: () => STILL, seconds, tuning, aspect });
		const [c, d] = later.wells;
		if (c === undefined || d === undefined) {
			throw new Error("the pair vanished");
		}
		const [x0 = 0, y0 = 0] = midpoint(a, b);
		const [x1 = 0, y1 = 0] = midpoint(c, d);
		// Each core moves in the other's flow: Γ(1 − e^(−s²/a²)) / (2πs).
		const pairSpeed =
			(Math.abs(a.spin) * (1 - Math.exp(-(0.2 ** 2) / a.core2))) /
			(2 * Math.PI * 0.2);
		expect((x1 - x0) / seconds).toBeCloseTo(-pairSpeed, 1);
		expect(Math.abs(x1 - x0) / seconds).toBeGreaterThan(0.9 * pairSpeed);
		expect(Math.abs(y1 - y0)).toBeLessThan(1e-3);
	});

	it("splits a pair heading for a wall and turns it back short of it", () => {
		const tuning = { ...GALAXY_TUNING, jitter: 0, decay: 1e9, spread: 0 };
		let { state } = firstPair({ x: 1, y: 0 }, tuning);
		let reach = 0;
		for (let frame = 0; frame < 60 * 10; frame += 1) {
			const dt = FRAME;
			const aspect = ASPECT;
			state = stepGalaxy({ state, shake: STILL, dt, tuning, aspect });
			reach = Math.min(reach, ...state.wells.map((well) => well.x));
		}
		const [c, d] = state.wells;
		if (c === undefined || d === undefined) {
			throw new Error("the pair vanished");
		}
		expect(reach).toBeLessThan(-0.3);
		expect(reach).toBeGreaterThan(-0.5);
		expect(Math.abs(c.y - d.y)).toBeGreaterThan(3 * tuning.spacing);
		expect(Math.max(Math.abs(c.y), Math.abs(d.y))).toBeLessThan(1);
	});
});

describe("addGalaxyFlow", () => {
	const wells: Well[] = [
		{ x: -0.3, y: 0.2, spin: 0.8, core2: 0.0144, age: 0 },
		{ x: 0.2, y: -0.1, spin: -0.5, core2: 0.03, age: 0 },
		{ x: 0.1, y: 0.55, spin: 0.6, core2: 0.02, age: 0 },
	];

	it("is divergence-free, and swirls, with no spiral", () => {
		const points = grid();
		const stencil = points.flatMap(([x = 0, y = 0]) =>
			NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy]),
		);
		const tuning = { ...GALAXY_TUNING, spiral: 0 };
		const flow = flowAt(wellsState(wells), stencil, tuning);
		const u = (point: number, side: number, axis: number) =>
			at(flow, (point * 4 + side) * 2 + axis);
		const divergence = points.map(
			(_, p) => (u(p, 0, 0) - u(p, 1, 0) + u(p, 2, 1) - u(p, 3, 1)) / (2 * H),
		);
		const vorticity = points.map(
			(_, p) => (u(p, 0, 1) - u(p, 1, 1) - u(p, 2, 0) + u(p, 3, 0)) / (2 * H),
		);
		const speed = points.map((_, p) => Math.hypot(u(p, 0, 0), u(p, 0, 1)));
		expect(Math.max(...divergence.map(Math.abs))).toBeLessThan(0.02);
		expect(Math.max(...vorticity.map(Math.abs))).toBeGreaterThan(5);
		expect(Math.max(...speed)).toBeGreaterThan(0.3);
	});

	it.each([0.8, -0.8])("draws a particle into a core of spin %d", (spin) => {
		const tuning = { ...GALAXY_TUNING, spiral: 0.15 };
		const state = wellsState([{ x: 0, y: 0, spin, core2: 0.0144, age: 0 }]);
		const [px, py] = [0.06, 0.03];
		const flow = flowAt(state, [[px, py]], tuning);
		const r = Math.hypot(px, py);
		const radial = (at(flow, 0) * px + at(flow, 1) * py) / r;
		const tangential = (at(flow, 1) * px - at(flow, 0) * py) / r;
		expect(Math.sign(tangential)).toBe(Math.sign(spin));
		expect(radial / Math.abs(tangential)).toBeCloseTo(-tuning.spiral, 4);
	});
});
