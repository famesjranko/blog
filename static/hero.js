const hero = document.querySelector("[data-hero]");
if (hero instanceof HTMLElement && "matchMedia" in window) {
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
	setupParallax(hero, reducedMotion || coarsePointer);
	if (!reducedMotion) {
		scheduleField(hero);
	}
}

function setupParallax(hero, disabled) {
	if (disabled) {
		return;
	}
	let scheduled = false;
	hero.addEventListener(
		"pointermove",
		(event) => {
			if (scheduled) {
				return;
			}
			scheduled = true;
			window.requestAnimationFrame(() => {
				scheduled = false;
				const rect = hero.getBoundingClientRect();
				if (rect.width === 0 || rect.height === 0) {
					return;
				}
				const x = (event.clientX - rect.left) / rect.width - 0.5;
				const y = (event.clientY - rect.top) / rect.height - 0.5;
				hero.style.setProperty("--px", x.toFixed(3));
				hero.style.setProperty("--py", y.toFixed(3));
			});
		},
		{ passive: true },
	);
}

// Tier before downloading anything: data-saver mode keeps the CSS washes,
// phones get a small low-DPR field, weak laptops a mid one, desktops the
// full one. Returning null means "skip WebGL entirely".
function pickTier() {
	const connection = navigator.connection;
	if (connection !== undefined && connection.saveData === true) {
		return null;
	}
	const smallScreen = window.matchMedia("(max-width: 42rem)").matches;
	const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
	if (smallScreen || coarsePointer) {
		return { count: 320, pixelRatio: 1 };
	}
	const memory = navigator.deviceMemory ?? 8;
	const cores = navigator.hardwareConcurrency ?? 8;
	if (memory <= 4 || cores <= 4) {
		return { count: 750, pixelRatio: 1.5 };
	}
	return { count: 1600, pixelRatio: 2 };
}

function webglAvailable() {
	if (!("WebGL2RenderingContext" in window)) {
		return false;
	}
	const probe = document.createElement("canvas").getContext("webgl2");
	return probe !== null;
}

function scheduleField(hero) {
	const canvas = hero.querySelector("[data-thought-field]");
	if (!(canvas instanceof HTMLCanvasElement)) {
		return;
	}
	const tier = pickTier();
	if (tier === null || !webglAvailable()) {
		return;
	}
	const start = () => {
		void startField(canvas, tier);
	};
	if (!("IntersectionObserver" in window) || heroAlreadyVisible(hero)) {
		idle(start);
		return;
	}
	const seen = new IntersectionObserver((entries) => {
		if (entries.some((entry) => entry.isIntersecting)) {
			seen.disconnect();
			idle(start);
		}
	});
	seen.observe(hero);
}

function heroAlreadyVisible(hero) {
	const rect = hero.getBoundingClientRect();
	return rect.top < window.innerHeight && rect.bottom > 0;
}

function idle(callback) {
	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(() => callback(), { timeout: 2500 });
	} else {
		window.setTimeout(callback, 1200);
	}
}

async function startField(canvas, tier) {
	try {
		const sibling = new URL("./thought-field.js", import.meta.url);
		const field = await import(sibling.href);
		field.initThoughtField(canvas, tier);
	} catch {
		// The CSS wash fallback stands alone; drop the empty canvas.
		canvas.remove();
	}
}
