(() => {
	const hero = document.querySelector("[data-hero]");
	if (!(hero instanceof HTMLElement)) {
		return;
	}
	if (!("matchMedia" in window)) {
		return;
	}
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
		return;
	}
	if (window.matchMedia("(pointer: coarse)").matches) {
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
})();
