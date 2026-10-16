import { expect, test } from "@playwright/test";

test("on a phone the health report keeps the figure shape at full column width", async ({
	page,
}) => {
	// Given the article on a 390x844 phone viewport.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/ai-engineering/ai-infrastructure/");
	const figure = page.locator(".fade-figure img:visible");

	// When the figure renders inline.
	const { width, height } = await figure.evaluate((img) =>
		img.getBoundingClientRect(),
	);

	// Then its shape is 740 by 440 within 1 percent, so the crop cuts only height.
	expect(Math.abs(width / height / (740 / 440) - 1)).toBeLessThan(0.01);
});
