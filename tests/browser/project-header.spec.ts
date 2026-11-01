import { expect, type Locator, test } from "@playwright/test";

async function box(locator: Locator) {
	const bounds = await locator.boundingBox();
	if (bounds === null) {
		throw new Error(`expected a visible box for ${locator}`);
	}
	return bounds;
}

// Both widths have the sidebar beside the article: 934 is narrow enough that
// the column is below the prose measure, 1100 wide enough that it reaches it.
for (const width of [934, 1100]) {
	test(`project header matches the article column at ${width} pixels`, async ({
		page,
	}) => {
		// Given a viewport of the stated width.
		await page.setViewportSize({ width, height: 900 });

		// When the MediaStack project page is opened.
		await page.goto("/projects/mediastack/");

		// Then the header starts where the article column starts.
		const header = await box(page.locator(".project-header"));
		const column = await box(page.locator(".project-main"));
		expect(
			Math.abs(header.x - column.x),
			"header starts at the column",
		).toBeLessThanOrEqual(1);
		// And the header is as wide as the article column.
		expect(
			Math.abs(header.width - column.width),
			"header is as wide as the column",
		).toBeLessThanOrEqual(1);
	});
}
