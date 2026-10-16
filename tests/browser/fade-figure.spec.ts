import { expect, test } from "@playwright/test";

const PAGE = "/ai-engineering/ai-infrastructure/";

test("the health report is cropped with a fade and opens whole in the lightbox", async ({
	page,
}) => {
	// Given the article with the tall health report figure.
	await page.goto(PAGE);
	const figure = page.locator(".fade-figure img:visible");
	const dialog = page.locator("dialog.lightbox");
	await figure.scrollIntoViewIfNeeded();

	// When the figure renders inline.
	const inline = await figure.evaluate((img) => {
		const style = getComputedStyle(img);
		return {
			ratio:
				img.getBoundingClientRect().width / img.getBoundingClientRect().height,
			mask: style.maskImage || style.webkitMaskImage,
		};
	});

	// Then it keeps the 740 by 440 shape and carries a mask image.
	expect(Math.abs(inline.ratio / (740 / 440) - 1)).toBeLessThan(0.01);
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
	expect(Math.abs(box.ratio / (1600 / 1609) - 1)).toBeLessThan(0.01);
	// And the lightbox image has no mask.
	expect(box.mask).toBe("none");
});

test("on a phone the health report keeps its full width and is cropped only at the bottom", async ({
	page,
}) => {
	// Given the article on a 390x844 phone viewport.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(PAGE);
	const figure = page.locator(".fade-figure img:visible");
	await figure.scrollIntoViewIfNeeded();

	// When the figure renders inline.
	const { width, height } = await figure.evaluate((img) => {
		const rect = img.getBoundingClientRect();
		return { width: rect.width, height: rect.height };
	});

	// Then its shape is 740 by 440 within 1 percent.
	expect(Math.abs(width / height / (740 / 440) - 1)).toBeLessThan(0.01);
	// And it is narrower than 400px, so cover shows the whole image width.
	expect(width).toBeLessThan(400);
});
