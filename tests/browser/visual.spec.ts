import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const isDebian =
	process.platform === "linux" &&
	/^ID=debian$/m.test(readFileSync("/etc/os-release", "utf8"));

test.use({
	viewport: { width: 1280, height: 900 },
	deviceScaleFactor: 1,
	colorScheme: "light",
	reducedMotion: "reduce",
});

test.beforeEach(() => {
	test.skip(
		process.platform !== "linux",
		"Visual baselines target Ubuntu Chromium.",
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

// Debian font edges need their own baselines; Ubuntu CI uses the original names.
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
	const snapshotName = isDebian ? name.replace(/\.png$/, "-debian.png") : name;
	await expect(region).toHaveScreenshot(snapshotName, {
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

test("featured essay card grid", async ({ page }) => {
	// Given the desktop home page with featured essay cards.
	await openStillPage(page, "/");
	const cards = page.locator("#featured-essays .card-grid");

	// When the card grid is captured.
	await cards.scrollIntoViewIfNeeded();

	// Then both cards match the baseline.
	await expectRegionScreenshot(cards, "card-grid.png", 74);
});

test("Connect-4 diagram pair", async ({ page }) => {
	// Given the heuristic project with its first two diagrams together.
	await openStillPage(page, "/projects/connect4-heuristic/");
	const pair = page.locator(".diagram-pair").first();
	await expect(pair.locator("svg.diagram")).toHaveCount(2);
	await expect(pair.locator("figcaption")).toHaveCount(2);
	// SVG labels and captions rasterize differently across Linux distributions.
	await pair.evaluate((element) => {
		for (const label of element.querySelectorAll("svg text, figcaption")) {
			(label as HTMLElement | SVGElement).style.visibility = "hidden";
		}
	});

	// When the pair is captured.
	await pair.scrollIntoViewIfNeeded();

	// Then both board positions match the baseline.
	await expectRegionScreenshot(pair, "diagram-pair.png", 25);
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
