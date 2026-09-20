import * as THREE from "./three.module.min.js";

// Custom properties compute to their raw text, which for a light-dark()
// token is not a colour THREE can parse. Applying the token to a probe's
// color inside ELEMENT yields the resolved rgb() for that element's
// colour scheme.
function cssVar(element, name, fallback) {
	const probe = document.createElement("span");
	probe.style.color = `var(${name})`;
	element.append(probe);
	const value = getComputedStyle(probe).color;
	probe.remove();
	return value === "" || value === "rgba(0, 0, 0, 0)" ? fallback : value;
}

// Tokens are read inside ELEMENT so the palette matches that element's
// resolved colour scheme rather than the document root's.
export function buildPalette(dark, element = document.documentElement) {
	const accent = cssVar(
		element,
		"--color-accent",
		dark ? "#93b8a9" : "#33594e",
	);
	const ink = cssVar(element, "--color-text", dark ? "#ececec" : "#161616");
	const muted = cssVar(element, "--color-muted", dark ? "#a3a3a3" : "#5c5c5c");
	const wash1 = cssVar(element, "--color-wash-1", dark ? "#2a332c" : "#d9ded3");
	const wash2 = cssVar(element, "--color-wash-2", dark ? "#2e2e2e" : "#dedede");
	const wash3 = cssVar(element, "--color-wash-3", dark ? "#22303a" : "#cdd5da");
	const picks = [
		accent,
		accent,
		accent,
		ink,
		ink,
		muted,
		muted,
		wash1,
		wash2,
		wash3,
	];
	return {
		palette: picks.map((hex) => new THREE.Color(hex)),
		accent: new THREE.Color(accent),
	};
}

export function pointerStrength(lastMove, now) {
	const age = now - lastMove;
	if (age < 2000) {
		return 1;
	}
	return Math.max(0, 1 - (age - 2000) / 1000);
}

function fillField(field) {
	const { count, palette, pos, col, base, phase, scale } = field;
	for (let i = 0; i < count; i += 1) {
		const ix = i * 3;
		base[ix] = Math.random() * 2 - 1;
		base[ix + 1] = Math.random() * 2 - 1;
		base[ix + 2] = 0;
		pos[ix] = base[ix];
		pos[ix + 1] = base[ix + 1];
		pos[ix + 2] = 0;
		const tint = palette[Math.floor(Math.random() * palette.length)];
		col[ix] = tint.r;
		col[ix + 1] = tint.g;
		col[ix + 2] = tint.b;
		phase[i * 2] = Math.random() * Math.PI * 2;
		phase[i * 2 + 1] = Math.random() * Math.PI * 2;
		scale[i] = 0.9 + Math.random() * 0.9;
	}
}

export function makePoints(count, palette) {
	const field = {
		count,
		palette,
		pos: new Float32Array(count * 3),
		col: new Float32Array(count * 3),
		base: new Float32Array(count * 3),
		phase: new Float32Array(count * 2),
		scale: new Float32Array(count),
	};
	fillField(field);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(field.pos, 3));
	geometry.setAttribute("aColor", new THREE.BufferAttribute(field.col, 3));
	geometry.setAttribute("aScale", new THREE.BufferAttribute(field.scale, 1));
	return { ...field, geometry };
}

function repel(options) {
	const { pos, ix, cx, cy, radius2, push } = options;
	const dx = pos[ix] - cx;
	const dy = pos[ix + 1] - cy;
	const d2 = dx * dx + dy * dy;
	if (d2 < radius2 && d2 > 0.000001) {
		const force = 1 - d2 / radius2;
		const inverseDistance = 1 / Math.sqrt(d2);
		pos[ix] += dx * inverseDistance * force * force * push;
		pos[ix + 1] += dy * inverseDistance * force * force * push;
	}
}

export function stepParticles(options) {
	const { field, aspect, time, dt, pointer, meteors } = options;
	const ease = 1 - Math.exp(-dt * 1.1);
	const rate = Math.min(dt * 60, 3);
	for (let i = 0; i < field.count; i += 1) {
		const ix = i * 3;
		const p1 = field.phase[i * 2];
		const p2 = field.phase[i * 2 + 1];
		const tx =
			field.base[ix] * aspect +
			0.09 * Math.sin(0.21 * time + p1) +
			0.05 * Math.cos(0.13 * time + 1.7 * p2);
		const ty =
			field.base[ix + 1] +
			0.09 * Math.cos(0.17 * time + 1.3 * p2) +
			0.05 * Math.sin(0.11 * time + 0.7 * p1);
		field.pos[ix] += (tx - field.pos[ix]) * ease;
		field.pos[ix + 1] += (ty - field.pos[ix + 1]) * ease;
		applyRepulsion({ field, ix, pointer, meteors, rate });
	}
}

function applyRepulsion(options) {
	const { field, ix, pointer, meteors, rate } = options;
	if (pointer.strength > 0) {
		repel({
			pos: field.pos,
			ix,
			cx: pointer.x,
			cy: pointer.y,
			radius2: 0.45 * 0.45,
			push: 0.02 * rate * pointer.strength,
		});
	}
	for (const slot of meteors.slots) {
		if (slot.active) {
			repel({
				pos: field.pos,
				ix,
				cx: slot.x,
				cy: slot.y,
				radius2: 0.3 * 0.3,
				push: 0.005 * rate,
			});
		}
	}
}
