import * as THREE from "./three.module.min.js";

const METEOR_SLOTS = 2;
const METEOR_TRAIL = 40;

function newSlot() {
	return {
		active: false,
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		gap: 0,
		age: 0,
		life: 0,
		size: 1,
	};
}

export function makeMeteors(accent) {
	const total = METEOR_SLOTS * METEOR_TRAIL;
	const pos = new Float32Array(total * 3);
	const col = new Float32Array(total * 3);
	const alpha = new Float32Array(total);
	const scale = new Float32Array(total);
	for (let i = 0; i < total; i += 1) {
		const trailIndex = i % METEOR_TRAIL;
		col[i * 3] = accent.r;
		col[i * 3 + 1] = accent.g;
		col[i * 3 + 2] = accent.b;
		scale[i] = 2.2 - 1.4 * (trailIndex / METEOR_TRAIL);
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geometry.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
	geometry.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
	geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
	return {
		geometry,
		pos,
		alpha,
		scale,
		slots: Array.from({ length: METEOR_SLOTS }, newSlot),
		started: false,
		nextAt: 0,
		burstLeft: 0,
	};
}

function scheduleNext(meteors, now) {
	const state = meteors;
	if (state.burstLeft > 0) {
		state.burstLeft -= 1;
		state.nextAt = now + 0.8 + Math.random() * 1.7;
		return;
	}
	if (Math.random() < 0.15) {
		state.burstLeft = 1;
		state.nextAt = now + 0.8 + Math.random() * 1.7;
		return;
	}
	state.nextAt = now + 14 + Math.random() * 18;
}

function entryVector(aspect) {
	const edge = Math.floor(Math.random() * 3);
	if (edge === 0) {
		return {
			x: -aspect - 0.4,
			y: -0.6 + Math.random() * 1.6,
			angle: -(0.17 + Math.random() * 0.44),
		};
	}
	if (edge === 1) {
		return {
			x: -aspect + Math.random() * aspect * 2,
			y: 1.4,
			angle: -(0.96 + Math.random() * 0.44),
		};
	}
	return {
		x: aspect + 0.4,
		y: -0.6 + Math.random() * 1.6,
		angle: Math.PI + 0.17 + Math.random() * 0.44,
	};
}

function spawnMeteor(options) {
	const { meteors, slot, aspect, now } = options;
	const target = slot;
	const speed = 1.2 + Math.random() * 1.6;
	const entry = entryVector(aspect);
	target.active = true;
	target.x = entry.x;
	target.y = entry.y;
	target.vx = Math.cos(entry.angle) * speed;
	target.vy = Math.sin(entry.angle) * speed;
	target.gap = ((speed * 0.35) / METEOR_TRAIL) * (0.8 + Math.random() * 0.5);
	target.age = 0;
	target.life = 3.2;
	target.size = 0.8 + Math.random() * 0.6;
	scheduleNext(meteors, now);
}

function clearSlot(alpha, base) {
	const values = alpha;
	for (let j = 0; j < METEOR_TRAIL; j += 1) {
		values[base + j] = 0;
	}
}

function slotIsGone(slot, aspect) {
	return (
		slot.age >= slot.life ||
		slot.x < -aspect - 1.5 ||
		slot.x > aspect + 1.5 ||
		slot.y < -2.5 ||
		slot.y > 2.5
	);
}

function writeTrail(options) {
	const { meteors, slot, base, fade } = options;
	const speed = Math.sqrt(slot.vx * slot.vx + slot.vy * slot.vy);
	const dx = slot.vx / speed;
	const dy = slot.vy / speed;
	for (let j = 0; j < METEOR_TRAIL; j += 1) {
		const i = base + j;
		const progress = j / METEOR_TRAIL;
		meteors.pos[i * 3] = slot.x - dx * slot.gap * j;
		meteors.pos[i * 3 + 1] = slot.y - dy * slot.gap * j;
		meteors.pos[i * 3 + 2] = 0;
		meteors.alpha[i] = fade * (1 - progress) * (1 - progress);
		meteors.scale[i] = (2.2 - 1.4 * progress) * slot.size;
	}
}

function writeSlot(options) {
	const { meteors, slot, index, aspect, dt } = options;
	const target = slot;
	const base = index * METEOR_TRAIL;
	if (!target.active) {
		clearSlot(meteors.alpha, base);
		return;
	}
	target.age += dt;
	target.x += target.vx * dt;
	target.y += target.vy * dt;
	if (slotIsGone(target, aspect)) {
		target.active = false;
		clearSlot(meteors.alpha, base);
		return;
	}
	const fade = Math.min(
		Math.min(target.age / 0.12, 1),
		Math.max(Math.min((target.life - target.age) / 0.8, 1), 0),
	);
	writeTrail({ meteors, slot: target, base, fade });
}

export function stepMeteors(meteors, aspect, now, dt) {
	const state = meteors;
	if (!state.started) {
		state.started = true;
		state.nextAt = now + 1.2 + Math.random() * 1.8;
	}
	if (now >= state.nextAt) {
		const slot = state.slots.find((candidate) => !candidate.active);
		if (slot === undefined) {
			state.nextAt = now + 5;
		} else {
			spawnMeteor({ meteors: state, slot, aspect, now });
		}
	}
	for (let index = 0; index < state.slots.length; index += 1) {
		writeSlot({ meteors: state, slot: state.slots[index], index, aspect, dt });
	}
}
