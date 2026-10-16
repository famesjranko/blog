import { expect, test } from "@playwright/test";

const PAGE = "/ai-engineering/ai-infrastructure/";
const LIGHT = "/img/ai-engineering/ai-infrastructure/health-report-light.png";
const DARK = "/img/ai-engineering/ai-infrastructure/health-report.png";

const cases = [
	{
		name: "a light OS with no stored theme",
		os: "light",
		stored: null,
		file: LIGHT,
	},
	{
		name: "a dark OS with no stored theme",
		os: "dark",
		stored: null,
		file: DARK,
	},
	{
		name: "a stored light theme on a dark OS",
		os: "dark",
		stored: "light",
		file: LIGHT,
	},
	{
		name: "a stored dark theme on a light OS",
		os: "light",
		stored: "dark",
		file: DARK,
	},
] as const;

for (const c of cases) {
	test(`the health report figure matches the theme for ${c.name}`, async ({
		page,
	}) => {
		// Given a visitor with this OS colour scheme and stored theme.
		await page.emulateMedia({ colorScheme: c.os });

		// When the article opens.
		await page.goto(PAGE);
		if (c.stored) {
			await page.evaluate(
				(theme) => document.documentElement.setAttribute("data-theme", theme),
				c.stored,
			);
		}
		const visible = page.locator(
			'.fade-figure img[src*="/health-report"]:visible',
		);
		await visible.scrollIntoViewIfNeeded();

		// Then exactly one health report image is visible, and it is the right file.
		await expect(visible).toHaveCount(1);
		await expect(visible).toHaveAttribute("src", c.file);

		// When the visible figure is activated.
		await visible.click();

		// Then the lightbox shows that same file without the fade mask.
		const dialog = page.locator("dialog.lightbox");
		await expect(dialog).toBeVisible();
		const shown = dialog.locator("img");
		await expect(shown).toHaveAttribute("src", c.file);
		// And the lightbox image has no mask.
		const mask = await shown.evaluate((img) => {
			const style = getComputedStyle(img);
			return style.maskImage || style.webkitMaskImage;
		});
		expect(mask).toBe("none");
	});
}
