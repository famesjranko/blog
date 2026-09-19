// Thought Field: a calm, amorphic particle current for the blog hero.
//
// One THREE.Points draw call for the ambient drift, plus one small draw for
// rare meteor streaks. Particles drift on slow sinusoidal currents tinted
// from the site wash palette, part around the pointer, and refill.
// Designed to be disposable: any failure leaves the CSS washes behind.
//
// three@0.180.0 was picked over 0.170.0 deliberately: the minified module
// is ~339KB vs ~692KB. It is self-hosted (exact npm pin, copied to dist/
// by src/build.ts) so the bytes are deterministic and the field works
// offline; the module is still fetched lazily (idle + hero visible).
// Data-saver mode and reduced-motion users never download it.
import * as THREE from "./three.module.min.js";

const VERT = `
attribute vec3 aColor;
attribute float aScale;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
void main() {
	vColor = aColor;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = uSize * aScale * uPixelRatio;
	gl_Position = projectionMatrix * mv;
}
`;

const FRAG = `
varying vec3 vColor;
uniform float uGlow;
uniform float uAlpha;
void main() {
	float d = length(gl_PointCoord - vec2(0.5));
	if (d > 0.5) {
		discard;
	}
	float core = smoothstep(0.5, 0.0, d);
	vec3 col = vColor * (0.55 + 0.85 * smoothstep(0.5, 0.18, d)) * uGlow;
	gl_FragColor = vec4(col, core * core * uAlpha);
}
`;

const METEOR_VERT = `
attribute vec3 aColor;
attribute float aScale;
attribute float aAlpha;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
	vColor = aColor;
	vAlpha = aAlpha;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_PointSize = uSize * aScale * uPixelRatio;
	gl_Position = projectionMatrix * mv;
}
`;

const METEOR_FRAG = `
varying vec3 vColor;
varying float vAlpha;
uniform float uGlow;
uniform float uAlpha;
void main() {
	float d = length(gl_PointCoord - vec2(0.5));
	if (d > 0.5) {
		discard;
	}
	float core = smoothstep(0.5, 0.0, d);
	vec3 col = vColor * (0.55 + 0.85 * smoothstep(0.5, 0.18, d)) * uGlow;
	gl_FragColor = vec4(col, core * core * uAlpha * vAlpha);
}
`;

function cssVar(name, fallback) {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value === "" ? fallback : value;
}

// Single source of truth: derive the particle palette from the live site
// tokens so light/dark edits in main.css flow through automatically.
function buildPalette(dark) {
	const accent = cssVar("--color-accent", dark ? "#93b8a9" : "#33594e");
	const ink = cssVar("--color-text", dark ? "#e7e0d1" : "#1b1813");
	const muted = cssVar("--color-muted", dark ? "#a29885" : "#6f675b");
	const wash1 = cssVar("--color-wash-1", dark ? "#2a332c" : "#dfe4d8");
	const wash2 = cssVar("--color-wash-2", dark ? "#38311f" : "#e8ddc9");
	const wash3 = cssVar("--color-wash-3", dark ? "#22303a" : "#d3dbe0");
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

// Pointer influence is staleness-driven, never latched: full strength while
// the pointer moves, fading out over the third idle second. This single
// mechanism covers pointerleave/pointerup/pointercancel uniformly — when
// moves stop arriving (finger lifted, cursor parked or gone), the hole
// refills instead of lingering forever.
function pointerStrength(lastMove, now) {
	const age = now - lastMove;
	if (age < 2000) {
		return 1;
	}
	return Math.max(0, 1 - (age - 2000) / 1000);
}

function fillField(count, palette, pos, col, base, phase, scale) {
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
		// Floor the size well above single-pixel territory: sub-2px points
		// crawling sub-pixel distances visibly shimmer as pixels snap.
		scale[i] = 0.9 + Math.random() * 0.9;
	}
}

function makePoints(count, palette) {
	const pos = new Float32Array(count * 3);
	const col = new Float32Array(count * 3);
	const base = new Float32Array(count * 3);
	const phase = new Float32Array(count * 2);
	const scale = new Float32Array(count);
	fillField(count, palette, pos, col, base, phase, scale);
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geometry.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
	geometry.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
	return { geometry, pos, base, phase };
}

function repel(state, ix, cx, cy, radius2, push) {
	const dx = state.pos[ix] - cx;
	const dy = state.pos[ix + 1] - cy;
	const d2 = dx * dx + dy * dy;
	if (d2 < radius2 && d2 > 0.000001) {
		const f = 1 - d2 / radius2;
		const inv = 1 / Math.sqrt(d2);
		state.pos[ix] += dx * inv * f * f * push;
		state.pos[ix + 1] += dy * inv * f * f * push;
	}
}

function stepParticles(state, count, aspect, time, dt, pointer, meteors) {
	const ease = 1 - Math.exp(-dt * 1.1);
	const rate = Math.min(dt * 60, 3);
	const push = 0.02 * rate;
	const wakePush = 0.005 * rate;
	const radius2 = 0.45 * 0.45;
	const wakeRadius2 = 0.3 * 0.3;
	for (let i = 0; i < count; i += 1) {
		const ix = i * 3;
		const p1 = state.phase[i * 2];
		const p2 = state.phase[i * 2 + 1];
		const tx =
			state.base[ix] * aspect +
			0.09 * Math.sin(0.21 * time + p1) +
			0.05 * Math.cos(0.13 * time + 1.7 * p2);
		const ty =
			state.base[ix + 1] +
			0.09 * Math.cos(0.17 * time + 1.3 * p2) +
			0.05 * Math.sin(0.11 * time + 0.7 * p1);
		state.pos[ix] += (tx - state.pos[ix]) * ease;
		state.pos[ix + 1] += (ty - state.pos[ix + 1]) * ease;
		if (pointer.strength > 0) {
			repel(state, ix, pointer.x, pointer.y, radius2, push * pointer.strength);
		}
		for (let w = 0; w < meteors.slots.length; w += 1) {
			const slot = meteors.slots[w];
			if (slot.active) {
				repel(state, ix, slot.x, slot.y, wakeRadius2, wakePush);
			}
		}
	}
}

const METEOR_SLOTS = 2;
// 40 trail points keeps adjacent soft discs overlapping at DPR 1 even for
// the fastest meteors (~6px spacing vs ~6px mid-tail diameter); the tail
// tip stays tapered via the (1-t)^2 alpha falloff in writeSlot.
const METEOR_TRAIL = 40;

// Rare streaks crossing the field: each meteor is a head point plus a trail
// of fading points laid along its velocity. Spawns are timed in the render
// loop, so nothing fires while the hero is offscreen or the tab is hidden.
function makeMeteors(accent) {
	const total = METEOR_SLOTS * METEOR_TRAIL;
	const pos = new Float32Array(total * 3);
	const col = new Float32Array(total * 3);
	const alpha = new Float32Array(total);
	const scale = new Float32Array(total);
	for (let s = 0; s < METEOR_SLOTS; s += 1) {
		for (let j = 0; j < METEOR_TRAIL; j += 1) {
			const i = s * METEOR_TRAIL + j;
			col[i * 3] = accent.r;
			col[i * 3 + 1] = accent.g;
			col[i * 3 + 2] = accent.b;
			scale[i] = 2.2 - 1.4 * (j / METEOR_TRAIL);
		}
	}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geometry.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
	geometry.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
	geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
	const slots = [];
	for (let s = 0; s < METEOR_SLOTS; s += 1) {
		slots.push({
			active: false,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			gap: 0,
			age: 0,
			life: 0,
			size: 1,
		});
	}
	return {
		geometry,
		pos,
		alpha,
		scale,
		slots,
		started: false,
		nextAt: 0,
		burstLeft: 0,
	};
}

// Quiet-first pacing: mostly lone streaks after a long gap, with a rarer
// second streak close behind (a pair, never more — there are only two
// slots, so a larger volley would smear into a straggler).
function scheduleNext(meteors, now) {
	if (meteors.burstLeft > 0) {
		meteors.burstLeft -= 1;
		meteors.nextAt = now + 0.8 + Math.random() * 1.7;
		return;
	}
	if (Math.random() < 0.15) {
		meteors.burstLeft = 1;
		meteors.nextAt = now + 0.8 + Math.random() * 1.7;
		return;
	}
	meteors.nextAt = now + 14 + Math.random() * 18;
}

function spawnMeteor(meteors, slot, aspect, now) {
	const edge = Math.floor(Math.random() * 3);
	const speed = 1.2 + Math.random() * 1.6;
	let x = 0;
	let y = 0;
	let angle = 0;
	if (edge === 0) {
		x = -aspect - 0.4;
		y = -0.6 + Math.random() * 1.6;
		angle = -(0.17 + Math.random() * 0.44);
	} else if (edge === 1) {
		x = -aspect + Math.random() * aspect * 2;
		y = 1.4;
		angle = -(0.96 + Math.random() * 0.44);
	} else {
		x = aspect + 0.4;
		y = -0.6 + Math.random() * 1.6;
		angle = Math.PI + (0.17 + Math.random() * 0.44);
	}
	slot.active = true;
	slot.x = x;
	slot.y = y;
	slot.vx = Math.cos(angle) * speed;
	slot.vy = Math.sin(angle) * speed;
	slot.gap = ((speed * 0.35) / METEOR_TRAIL) * (0.8 + Math.random() * 0.5);
	slot.age = 0;
	slot.life = 3.2;
	slot.size = 0.8 + Math.random() * 0.6;
	scheduleNext(meteors, now);
}

function writeSlot(meteors, slot, index, aspect, dt) {
	const base = index * METEOR_TRAIL;
	if (!slot.active) {
		for (let j = 0; j < METEOR_TRAIL; j += 1) {
			meteors.alpha[base + j] = 0;
		}
		return;
	}
	slot.age += dt;
	slot.x += slot.vx * dt;
	slot.y += slot.vy * dt;
	// Cull margins exceed the longest possible trail (~1.3 world units),
	// so the whole streak is offscreen before the slot deactivates —
	// otherwise the visible trail tip would pop out in one frame.
	const gone =
		slot.age >= slot.life ||
		slot.x < -aspect - 1.5 ||
		slot.x > aspect + 1.5 ||
		slot.y < -2.5 ||
		slot.y > 2.5;
	if (gone) {
		slot.active = false;
		for (let j = 0; j < METEOR_TRAIL; j += 1) {
			meteors.alpha[base + j] = 0;
		}
		return;
	}
	const speed = Math.sqrt(slot.vx * slot.vx + slot.vy * slot.vy);
	const dx = slot.vx / speed;
	const dy = slot.vy / speed;
	// Fade-in is deliberately quicker than the fastest edge entry (~0.15s
	// from spawn to crossing): the whole ramp happens offscreen, so every
	// meteor arrives at full brightness instead of materialising mid-frame.
	// The life fade-out stays slow — slow meteors visibly burn out mid-flight.
	const fade = Math.min(
		Math.min(slot.age / 0.12, 1),
		Math.max(Math.min((slot.life - slot.age) / 0.8, 1), 0),
	);
	for (let j = 0; j < METEOR_TRAIL; j += 1) {
		const i = base + j;
		const t = j / METEOR_TRAIL;
		meteors.pos[i * 3] = slot.x - dx * slot.gap * j;
		meteors.pos[i * 3 + 1] = slot.y - dy * slot.gap * j;
		meteors.pos[i * 3 + 2] = 0;
		meteors.alpha[i] = fade * (1 - t) * (1 - t);
		meteors.scale[i] = (2.2 - 1.4 * t) * slot.size;
	}
}

function stepMeteors(meteors, aspect, now, dt) {
	if (!meteors.started) {
		meteors.started = true;
		// Short fuse on purpose: wall-clock first streak already includes
		// the idle wait plus the three.js download/compile, so the
		// field-relative delay stays small (~1–3s) to land one early.
		meteors.nextAt = now + 1.2 + Math.random() * 1.8;
	}
	if (now >= meteors.nextAt) {
		const slot = meteors.slots.find((s) => !s.active);
		if (slot === undefined) {
			meteors.nextAt = now + 5;
		} else {
			spawnMeteor(meteors, slot, aspect, now);
		}
	}
	for (let s = 0; s < meteors.slots.length; s += 1) {
		writeSlot(meteors, meteors.slots[s], s, aspect, dt);
	}
}

export function initThoughtField(canvas, tier) {
	const hero = canvas.closest("[data-hero]") ?? canvas.parentElement;
	const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const renderer = new THREE.WebGLRenderer({
		canvas,
		alpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	});
	renderer.setClearColor(0x000000, 0);
	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
	camera.position.z = 2;
	const { palette, accent } = buildPalette(dark);
	const count = Math.max(1, Math.floor(tier.count));
	const field = makePoints(count, palette);
	// Shared uniform object: both materials track resizes through one write.
	const pixelRatio = { value: 1 };
	const material = new THREE.ShaderMaterial({
		vertexShader: VERT,
		fragmentShader: FRAG,
		uniforms: {
			uSize: { value: 3.2 },
			uPixelRatio: pixelRatio,
			uGlow: { value: dark ? 1.1 : 0.9 },
			uAlpha: { value: dark ? 0.75 : 0.5 },
		},
		transparent: true,
		depthWrite: false,
		blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
	scene.add(new THREE.Points(field.geometry, material));
	const meteors = makeMeteors(accent);
	const meteorMaterial = new THREE.ShaderMaterial({
		vertexShader: METEOR_VERT,
		fragmentShader: METEOR_FRAG,
		uniforms: {
			uSize: { value: 3.4 },
			uPixelRatio: pixelRatio,
			uGlow: { value: dark ? 1.3 : 1.0 },
			uAlpha: { value: dark ? 0.9 : 0.65 },
		},
		transparent: true,
		depthWrite: false,
		blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
	const meteorPoints = new THREE.Points(meteors.geometry, meteorMaterial);
	meteorPoints.frustumCulled = false;
	scene.add(meteorPoints);
	const pointer = { x: 9999, y: 9999, strength: 0, lastMove: -Infinity };
	const onPointerMove = (event) => {
		if (hero === null) {
			return;
		}
		const rect = hero.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return;
		}
		const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
		pointer.x = nx * (rect.width / rect.height);
		pointer.y = -ny;
		pointer.lastMove = performance.now();
	};
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	// Cached viewport shape for the hot loop: fitToHero (via ResizeObserver)
	// is the single writer, the tick only reads. No layout queries per frame.
	const dims = { aspect: 1 };
	const fitToHero = () => {
		if (hero === null) {
			return;
		}
		const rect = hero.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) {
			return;
		}
		const ratio = Math.min(window.devicePixelRatio || 1, tier.pixelRatio);
		renderer.setPixelRatio(ratio);
		renderer.setSize(rect.width, rect.height, false);
		pixelRatio.value = ratio;
		const aspect = rect.width / rect.height;
		dims.aspect = aspect;
		camera.left = -aspect;
		camera.right = aspect;
		camera.updateProjectionMatrix();
	};
	fitToHero();
	const loop = createLoop(
		renderer,
		scene,
		camera,
		field,
		count,
		pointer,
		hero,
		meteors,
		dims,
	);
	const resize = new ResizeObserver(fitToHero);
	if (hero !== null) {
		resize.observe(hero);
	}
	loop.start();
	const destroy = () => {
		loop.destroy();
		resize.disconnect();
		window.removeEventListener("pointermove", onPointerMove);
		field.geometry.dispose();
		material.dispose();
		meteors.geometry.dispose();
		meteorMaterial.dispose();
		renderer.dispose();
	};
	return { destroy };
}

function createLoop(
	renderer,
	scene,
	camera,
	field,
	count,
	pointer,
	hero,
	meteors,
	dims,
) {
	let frame = 0;
	let running = false;
	let last = performance.now();
	const tick = (now) => {
		frame = 0;
		if (!running) {
			return;
		}
		const dt = Math.min((now - last) / 1000, 0.05);
		last = now;
		const aspect = dims.aspect;
		const time = now / 1000;
		pointer.strength = pointerStrength(pointer.lastMove, now);
		stepMeteors(meteors, aspect, time, dt);
		stepParticles(field, count, aspect, time, dt, pointer, meteors);
		field.geometry.attributes.position.needsUpdate = true;
		meteors.geometry.attributes.position.needsUpdate = true;
		meteors.geometry.attributes.aAlpha.needsUpdate = true;
		meteors.geometry.attributes.aScale.needsUpdate = true;
		renderer.render(scene, camera);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(hero);
	const onChange = () => {
		if (visible() && !running) {
			start();
		} else if (!visible() && running) {
			stop();
		}
	};
	const start = () => {
		if (running) {
			return;
		}
		running = true;
		last = performance.now();
		frame = window.requestAnimationFrame(tick);
	};
	const stop = () => {
		running = false;
		if (frame !== 0) {
			window.cancelAnimationFrame(frame);
			frame = 0;
		}
	};
	const destroy = () => {
		stop();
		if (seen !== null) {
			seen.disconnect();
		}
		document.removeEventListener("visibilitychange", onChange);
	};
	const seen =
		"IntersectionObserver" in window && hero !== null
			? new IntersectionObserver((entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						onChange();
					} else {
						stop();
					}
				})
			: null;
	if (seen !== null && hero !== null) {
		seen.observe(hero);
	}
	document.addEventListener("visibilitychange", onChange);
	return { start, stop, destroy };
}

function heroVisible(hero) {
	if (hero === null || !("IntersectionObserver" in window)) {
		return true;
	}
	const rect = hero.getBoundingClientRect();
	return rect.bottom > 0 && rect.top < window.innerHeight;
}
