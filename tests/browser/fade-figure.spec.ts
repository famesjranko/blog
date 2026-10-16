import { expect, test } from "@playwright/test";

const PAGE = "/ai-engineering/ai-infrastructure/";

test("the health report is cropped with a fade and opens whole in the lightbox", async ({
	page,
}) => {
	// Given the article with the tall health report figure.
	await page.goto(PAGE);
	const figure = page.locator(".fade-figure img");
	const dialog = page.locator("dialog.lightbox");
	await figure.scrollIntoViewIfNeeded();

	// When the figure renders inline.
	const inline = await figure.evaluate((img) => {
		const style = getComputedStyle(img);
		return {
			height: img.getBoundingClientRect().height,
			mask: style.maskImage || style.webkitMaskImage,
		};
	});

	// Then it is 440px tall and carries a mask image.
	expect(Math.abs(inline.height - 440)).toBeLessThanOrEqual(1);
	expect(inline.mask).toContain("linear-gradient");

	// When the figure is activated.
	await figure.click();

	// Then the lightbox shows the whole image at its natural aspect ratio.
	const shown = dialog.locator("img");
	await expect(dialog).toBeVisible();
	const box = await shown.evaluate((img) => {
		const style = getComputedStyle(img);
		const rect = img.getBoundingClientRect();
		return {
			ratio: rect.width / rect.height,
			mask: style.maskImage || style.webkitMaskImage,
		};
	});
	expect(Math.abs(box.ratio / (2360 / 2374) - 1)).toBeLessThan(0.01);
	// And the lightbox image has no mask.
	expect(box.mask).toBe("none");
});
