import { pointerStrength, stepParticles } from "./thought-field-particles.js";
import { stepMeteors } from "./thought-field-meteors.js";

function renderFrame(options, now, dt) {
	const { renderer, scene, camera, field, pointer, meteors, dims } = options;
	const aspect = dims.aspect;
	const time = now / 1000;
	pointer.strength = pointerStrength(pointer.lastMove, now);
	stepMeteors(meteors, aspect, time, dt);
	stepParticles({ field, aspect, time, dt, pointer, meteors });
	field.geometry.attributes.position.needsUpdate = true;
	meteors.geometry.attributes.position.needsUpdate = true;
	meteors.geometry.attributes.aAlpha.needsUpdate = true;
	meteors.geometry.attributes.aScale.needsUpdate = true;
	renderer.render(scene, camera);
}

export function createLoop(options) {
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
		renderFrame(options, now, dt);
		frame = window.requestAnimationFrame(tick);
	};
	const visible = () => !document.hidden && heroVisible(options.hero);
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
	const onChange = () => {
		if (visible() && !running) {
			start();
		} else if (!visible() && running) {
			stop();
		}
	};
	const seen = observeHero(options.hero, onChange, stop);
	const destroy = () => {
		stop();
		seen?.disconnect();
		document.removeEventListener("visibilitychange", onChange);
	};
	document.addEventListener("visibilitychange", onChange);
	return { start, stop, destroy };
}

function observeHero(hero, onChange, stop) {
	if (!("IntersectionObserver" in window) || hero === null) {
		return null;
	}
	const seen = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			onChange();
		} else {
			stop();
		}
	});
	seen.observe(hero);
	return seen;
}

function heroVisible(hero) {
	if (hero === null || !("IntersectionObserver" in window)) {
		return true;
	}
	const rect = hero.getBoundingClientRect();
	return rect.bottom > 0 && rect.top < window.innerHeight;
}
