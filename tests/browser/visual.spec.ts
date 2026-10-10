import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({
	viewport: { width: 1280, height: 900 },
	deviceScaleFactor: 1,
	colorScheme: "light",
	reducedMotion: "reduce",
});

// Text rendering varies with each Linux distribution's fonts, so the
// baselines match only the Ubuntu CI runner that made them.
test.beforeEach(() => {
	test.skip(
		process.platform !== "linux" || process.env["CI"] !== "true",
		"Visual baselines run only on the Ubuntu CI runner.",
	);
});

async function openStillPage(page: Page, path: string) {
	await page.goto(path);
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				animation: none !important;
				transition: none !important;
				scroll-behavior: auto !important;
			}
			.hero-canvas { visibility: hidden !important; }
		`,
	});
}

async function expectRegionScreenshot(
	region: Locator,
	name: string,
	maxDiffPixels = 0,
) {
	await region.evaluate(async (element) => {
		await document.fonts.ready;
		await Promise.all(
			Array.from(element.querySelectorAll("img"), (image) => image.decode()),
		);
	});
	await expect(region).toHaveScreenshot(name, {
		animations: "disabled",
		caret: "hide",
		maxDiffPixels,
		threshold: 0.05,
	});
	const path = test.info().outputPath(name);
	await region.screenshot({ path, animations: "disabled", caret: "hide" });
	await test.info().attach(name, { path, contentType: "image/png" });
}

test("desktop header and primary navigation", async ({ page }) => {
	// Given the desktop home page with motion and its canvas stopped.
	await openStillPage(page, "/");
	const header = page.locator(".site-header");
	await expect(
		header.getByRole("navigation", { name: "Primary" }),
	).toBeVisible();

	// When the header is captured.
	await header.scrollIntoViewIfNeeded();

	// Then its name, controls, and navigation match the baseline.
	await expectRegionScreenshot(header, "header-navigation.png", 9);
});

test("essay heading and first image", async ({ page }) => {
	// Given the philosophy essay with its first image decoded.
	await openStillPage(page, "/essays/whatis-philosophy/");
	const article = page.locator("article.prose.essay");
	const firstImage = article.locator("picture img").first();
	await firstImage.evaluate((image) => {
		if (!(image instanceof HTMLImageElement)) {
			throw new Error("Essay cover is not an image");
		}
		return image.decode();
	});
	const height = await article.evaluate((element) => {
		const image = element.querySelector("picture img");
		if (!image) {
			throw new Error("Essay cover image is missing");
		}
		const bottom = image.getBoundingClientRect().bottom;
		return Math.ceil(bottom - element.getBoundingClientRect().top);
	});
	await page.addStyleTag({
		content: `article.prose.essay { height: ${height}px; overflow: hidden; }`,
	});

	// When the article introduction is captured.
	await article.scrollIntoViewIfNeeded();

	// Then the heading and first image match the baseline.
	await expectRegionScreenshot(article, "essay-heading-image.png", 2);
});

test("essay index card row", async ({ page }) => {
	// Given the desktop essays index with only its first row of cards.
	await openStillPage(page, "/essays/");
	await page.addStyleTag({
		content: ".card-grid > li:nth-child(n + 3) { display: none; }",
	});
	const cards = page.locator(".card-grid");

	// When the card row is captured.
	await cards.scrollIntoViewIfNeeded();

	// Then both cards match the baseline.
	await expectRegionScreenshot(cards, "essay-card-row.png", 74);
});

test("homepage featured section", async ({ page }) => {
	// Given the desktop home page with its showcase and section picks.
	await openStillPage(page, "/");
	const featured = page.locator("#featured");

	// When the Featured section is captured.
	await featured.scrollIntoViewIfNeeded();

	// Then the banner and the pick row match the baseline.
	await expectRegionScreenshot(featured, "home-featured.png");
});
