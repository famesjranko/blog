import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({
	viewport: { width: 1280, height: 900 },
	deviceScaleFactor: 1,
	colorScheme: "light",
	reducedMotion: "reduce",
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

async function expectRegionScreenshot(region: Locator, name: string) {
	await region.evaluate(async (element) => {
		await document.fonts.ready;
		await Promise.all(
			Array.from(element.querySelectorAll("img"), (image) => image.decode()),
		);
	});
	await expect(region).toHaveScreenshot(name, {
		animations: "disabled",
		caret: "hide",
	});
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
	await expectRegionScreenshot(header, "header-navigation.png");
});

test("essay heading and first image", async ({ page }) => {
	// Given the philosophy essay with its first image decoded.
	await openStillPage(page, "/essays/whatis-philosophy/");
	const article = page.locator("article.prose.essay");
	const firstImage = article.locator("picture img").first();
	await firstImage.evaluate((image) => image.decode());
	await article.evaluate((element) => {
		const image = element.querySelector("picture img");
		if (!image) {
			throw new Error("Essay cover image is missing");
		}
		const bottom = image.getBoundingClientRect().bottom;
		element.style.height = `${Math.ceil(bottom - element.getBoundingClientRect().top)}px`;
		element.style.overflow = "hidden";
	});

	// When the article introduction is captured.
	await article.scrollIntoViewIfNeeded();

	// Then the heading and first image match the baseline.
	await expectRegionScreenshot(article, "essay-heading-image.png");
});

test("featured essay card grid", async ({ page }) => {
	// Given the desktop home page with featured essay cards.
	await openStillPage(page, "/");
	const cards = page.locator("#featured-essays .card-grid");

	// When the card grid is captured.
	await cards.scrollIntoViewIfNeeded();

	// Then both cards match the baseline.
	await expectRegionScreenshot(cards, "card-grid.png");
});

test("Connect-4 diagram pair", async ({ page }) => {
	// Given the heuristic project with its first two diagrams together.
	await openStillPage(page, "/projects/connect4-heuristic/");
	const pair = page.locator(".diagram-pair").first();
	await expect(pair.locator("svg.diagram")).toHaveCount(2);

	// When the pair is captured.
	await pair.scrollIntoViewIfNeeded();

	// Then both diagrams and captions match the baseline.
	await expectRegionScreenshot(pair, "diagram-pair.png");
});

test("Connect-4 project figure", async ({ page }) => {
	// Given the web project with its debug panel figure.
	await openStillPage(page, "/projects/connect4-lisp-web/");
	const figure = page.locator(".project-main figure").first();
	await expect(figure.locator("img")).toHaveAttribute(
		"alt",
		"Mid-game with the debug panel open",
	);

	// When the figure is captured.
	await figure.scrollIntoViewIfNeeded();

	// Then its image and caption match the baseline.
	await expectRegionScreenshot(figure, "project-figure.png");
});
