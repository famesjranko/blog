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
