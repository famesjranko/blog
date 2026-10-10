import { expect, type Page, test } from "@playwright/test";

/** Each pick's height and its title and description offsets from its top. */
function pickMetrics(page: Page) {
	return page.locator(".home-pick").evaluateAll((picks) =>
		picks.map((pick) => {
			const top = pick.getBoundingClientRect().top;
			const offset = (selector: string) =>
				Math.round(
					(pick.querySelector(selector)?.getBoundingClientRect().top ??
						Number.NaN) - top,
				);
			return {
				height: Math.round(pick.getBoundingClientRect().height),
				title: offset(".home-pick-title"),
				description: offset(".home-pick-desc"),
			};
		}),
	);
}

test("home desktop picks are equal and their text lines up", async ({
	page,
}) => {
	// Given a wide desktop viewport.
	await page.setViewportSize({ width: 1280, height: 800 });

	// When the home page is opened.
	await page.goto("/");
	const picks = await pickMetrics(page);

	// Then the row has four picks of one height.
	expect(picks).toHaveLength(4);
	expect(new Set(picks.map((p) => p.height)).size, "pick heights").toBe(1);
	// And every title and every description starts on the same line.
	expect(new Set(picks.map((p) => p.title)).size, "title lines").toBe(1);
	expect(new Set(picks.map((p) => p.description)).size, "desc lines").toBe(1);
});

test("home mobile picks are equal and stack in one column", async ({
	page,
}) => {
	// Given a narrow phone viewport.
	await page.setViewportSize({ width: 390, height: 844 });

	// When the home page is opened.
	await page.goto("/");
	const picks = await pickMetrics(page);

	// Then the four picks share one height.
	expect(picks).toHaveLength(4);
	expect(new Set(picks.map((p) => p.height)).size, "pick heights").toBe(1);
});

test("home desktop showcase is shorter than the hero", async ({ page }) => {
	// Given a wide desktop viewport.
	await page.setViewportSize({ width: 1280, height: 800 });

	// When the home page is opened.
	await page.goto("/");
	const hero = await page.locator(".hero").boundingBox();
	const showcase = await page.locator(".showcase").boundingBox();

	// Then the showcase is well under the hero's height.
	expect(showcase?.height ?? Number.NaN).toBeLessThan(
		(hero?.height ?? 0) * 0.5,
	);
});

/**
 * The width each image's `sizes` attribute promises at this viewport and
 * the width it renders at. The first media condition that matches wins.
 */
function imageWidths(page: Page, selector: string) {
	return page.locator(selector).evaluateAll((images) =>
		images.map((image) => {
			const sizes = image
				.closest("picture")
				?.querySelector("source")
				?.getAttribute("sizes");
			const entries = (sizes ?? image.getAttribute("sizes") ?? "").split(
				/,\s*(?![^(]*\))/,
			);
			const match = entries
				.map((entry) => /^(\(.*?\))?\s*(.+)$/.exec(entry.trim()))
				.find((parts) => parts && (!parts[1] || matchMedia(parts[1]).matches));
			const probe = document.createElement("div");
			probe.style.width = match?.[2] ?? "0px";
			document.body.append(probe);
			const promised = probe.getBoundingClientRect().width;
			probe.remove();
			return {
				promised: Math.round(promised),
				rendered: Math.round(image.getBoundingClientRect().width),
			};
		}),
	);
}

for (const width of [1280, 1100, 900, 600, 390]) {
	test(`home image sizes match their rendered width at ${width}px`, async ({
		page,
	}) => {
		// Given a viewport of this width.
		await page.setViewportSize({ width, height: 900 });

		// When the home page is opened.
		await page.goto("/");
		const images = await imageWidths(
			page,
			".showcase-media img, .home-pick-media img",
		);

		// Then every image renders within 2px of the width its sizes promise.
		expect(images.length).toBeGreaterThan(0);
		for (const { promised, rendered } of images) {
			expect(
				Math.abs(promised - rendered),
				`${promised} vs ${rendered}`,
			).toBeLessThanOrEqual(2);
		}
	});
}
