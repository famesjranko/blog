import { expect, test } from "@playwright/test";

test("open mobile navigation scrolls away with the header", async ({
	browser,
}) => {
	// Given an essay on a narrow touch viewport with its menu open.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	await page.goto("/essays/dreyfus-review/");
	await page.getByRole("button", { name: "Open navigation" }).click();
	const nav = page.locator("#mobile-nav");
	await expect(nav).toBeVisible();
	// And its opening slide has finished, so it is at rest.
	await nav.evaluate((menu) =>
		Promise.all(menu.getAnimations().map((animation) => animation.finished)),
	);
	const gap = () =>
		page.evaluate(() => {
			const menu = document.querySelector("#mobile-nav");
			const toggle = document.querySelector(".menu-toggle");
			if (menu === null || toggle === null) {
				throw new Error("expected the menu and its toggle");
			}
			return Math.round(
				menu.getBoundingClientRect().top -
					toggle.getBoundingClientRect().bottom,
			);
		});
	const before = await gap();

	// When the page scrolls down by 600 pixels.
	await page.evaluate(() => window.scrollTo(0, 600));

	// Then the menu keeps the same place below its toggle.
	expect(await gap()).toBe(before);
	await context.close();
});
