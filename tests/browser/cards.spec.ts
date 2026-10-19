import { expect, test } from "@playwright/test";

// Notes render as `.note-row`; every other list uses `.card`.
const routes = [
	{ path: "/essays/", card: ".card" },
	{ path: "/notes/", card: ".note-row" },
	{ path: "/projects/", card: ".card" },
	{ path: "/ai-engineering/", card: ".card" },
	{ path: "/topics/heidegger/", card: ".card" },
];

test.use({ viewport: { width: 390, height: 844 } });

for (const { path, card } of routes) {
	test(`cards on ${path} have equal height on a narrow screen`, async ({
		page,
	}) => {
		// Given a phone-width viewport on a list page.
		await page.goto(path);

		// When I measure the height of every card in the list.
		const heights = await page
			.locator(card)
			.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));

		// Then the list has several cards and all heights match within 1px.
		expect(heights.length, `cards found on ${path}`).toBeGreaterThan(1);
		expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
	});
}
