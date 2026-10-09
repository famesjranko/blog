import { expect, type Locator, test } from "@playwright/test";

async function box(locator: Locator) {
	const bounds = await locator.boundingBox();
	if (bounds === null) {
		throw new Error(`expected a visible box for ${locator}`);
	}
	return bounds;
}

// The agentic engineering page mixes prose with two-column catalogue
// grids, a three-column strip, a roles table, inline diagrams, code and
// screenshots. Each must stay inside the reading column at phone and
// desktop widths, or the whole page scrolls sideways.
for (const width of [390, 1280]) {
	test(`agentic engineering blocks fit the column at ${width} pixels`, async ({
		page,
	}) => {
		// Given a viewport of the stated width.
		await page.setViewportSize({ width, height: 900 });

		// When the agentic engineering page is opened.
		await page.goto("/agentic-engineering/");

		// Then the page does not scroll sideways.
		const dimensions = await page.evaluate(() => ({
			viewport: window.innerWidth,
			content: document.documentElement.scrollWidth,
		}));
		expect(
			dimensions.content,
			"page must fit the viewport",
		).toBeLessThanOrEqual(dimensions.viewport + 1);

		// And every grid, strip, row list, table, figure and code block stays within the article.
		const article = await box(page.locator("article.prose.standalone"));
		const blocks = page.locator(
			".kit-grid, .steps, .rows, .table-scroll, figure, pre",
		);
		const count = await blocks.count();
		expect(count, "the page has its catalogue blocks").toBeGreaterThan(5);
		for (let i = 0; i < count; i++) {
			const block = await box(blocks.nth(i));
			expect(block.x, `block ${i} starts in the column`).toBeGreaterThanOrEqual(
				article.x - 1,
			);
			expect(
				block.x + block.width,
				`block ${i} fits the column`,
			).toBeLessThanOrEqual(article.x + article.width + 1);
		}
	});
}
