import * as THREE from "./three.module.min.js";
import { createLoop } from "./thought-field-loop.js";
import { makeMeteors } from "./thought-field-meteors.js";
import { buildPalette, makePoints } from "./thought-field-particles.js";
import {
	FIELD_FRAGMENT_SHADER,
	FIELD_VERTEX_SHADER,
	METEOR_FRAGMENT_SHADER,
	METEOR_VERTEX_SHADER,
} from "./thought-field-shaders.js";

function makeMaterial(options) {
	const { dark, pixelRatio, meteor } = options;
	const lightGlow = meteor ? 1 : 0.9;
	const darkGlow = meteor ? 1.3 : 1.1;
	const lightAlpha = meteor ? 0.65 : 0.5;
	const darkAlpha = meteor ? 0.9 : 0.75;
	return new THREE.ShaderMaterial({
		vertexShader: meteor ? METEOR_VERTEX_SHADER : FIELD_VERTEX_SHADER,
		fragmentShader: meteor ? METEOR_FRAGMENT_SHADER : FIELD_FRAGMENT_SHADER,
		uniforms: {
			uSize: { value: meteor ? 3.4 : 3.2 },
			uPixelRatio: pixelRatio,
			uGlow: { value: dark ? darkGlow : lightGlow },
			uAlpha: { value: dark ? darkAlpha : lightAlpha },
		},
		transparent: true,
		depthWrite: false,
		blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
	});
}

function pointerState(hero) {
	const pointer = { x: 9999, y: 9999, strength: 0, lastMove: -Infinity };
	const onMove = (event) => {
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
	window.addEventListener("pointermove", onMove, { passive: true });
	return {
		pointer,
		destroy: () => window.removeEventListener("pointermove", onMove),
	};
}

function resizeState(options) {
	const { hero, renderer, camera, pixelRatio, tier } = options;
	const dims = { aspect: 1 };
	const resize = () => {
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
		dims.aspect = rect.width / rect.height;
		camera.left = -dims.aspect;
		camera.right = dims.aspect;
		camera.updateProjectionMatrix();
	};
	resize();
	const observer = new ResizeObserver(resize);
	if (hero !== null) {
		observer.observe(hero);
	}
	return { dims, destroy: () => observer.disconnect() };
}

export function initThoughtField(canvas, tier) {
	const hero = canvas.closest("[data-hero]") ?? canvas.parentElement;
	// The hero forces a dark colour scheme regardless of the page theme.
	const dark = true;
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
	const { palette, accent } = buildPalette(dark, hero);
	const field = makePoints(Math.max(1, Math.floor(tier.count)), palette);
	const meteors = makeMeteors(accent);
	const pixelRatio = { value: 1 };
	const material = makeMaterial({ dark, pixelRatio, meteor: false });
	const meteorMaterial = makeMaterial({ dark, pixelRatio, meteor: true });
	scene.add(new THREE.Points(field.geometry, material));
	const meteorPoints = new THREE.Points(meteors.geometry, meteorMaterial);
	meteorPoints.frustumCulled = false;
	scene.add(meteorPoints);
	const pointer = pointerState(hero);
	const resize = resizeState({ hero, renderer, camera, pixelRatio, tier });
	const loop = createLoop({
		renderer,
		scene,
		camera,
		field,
		pointer: pointer.pointer,
		hero,
		meteors,
		dims: resize.dims,
	});
	loop.start();
	return {
		destroy: () => {
			loop.destroy();
			resize.destroy();
			pointer.destroy();
			field.geometry.dispose();
			material.dispose();
			meteors.geometry.dispose();
			meteorMaterial.dispose();
			renderer.dispose();
		},
	};
}
