import { expect, test, type Locator, type Page } from "@playwright/test";

async function box(locator: Locator) {
	const bounds = await locator.boundingBox();
	expect(bounds, `visible box for ${locator}`).not.toBeNull();
	return bounds as NonNullable<typeof bounds>;
}

async function expectNoHorizontalOverflow(page: Page) {
	const dimensions = await page.evaluate(() => ({
		viewport: window.innerWidth,
		content: document.documentElement.scrollWidth,
	}));
	expect(dimensions.content, "page must fit the viewport").toBeLessThanOrEqual(
		dimensions.viewport + 1,
	);
}

async function expectHeaderSeparation(page: Page) {
	const name = await box(page.locator(".site-name"));
	const actions = await box(page.locator(".header-actions"));
	expect(
		name.x + name.width + 8,
		"header name and controls must not overlap",
	).toBeLessThanOrEqual(actions.x);
}

async function expectMobileGutters(page: Page, width: number) {
	const wrap = await box(page.locator("main .wrap").first());
	const expected = Math.max(16, Math.min(width * 0.04, 40));
	expect(wrap.x, "left mobile gutter").toBeGreaterThanOrEqual(expected - 1);
	expect(
		width - wrap.x - wrap.width,
		"right mobile gutter",
	).toBeGreaterThanOrEqual(expected - 1);
}

test("home mobile hero, header, and cards fit one column", async ({
	browser,
}) => {
	// Given a narrow touch viewport with reduced motion.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "reduce",
		colorScheme: "dark",
	});
	const page = await context.newPage();

	// When the home page is opened.
	await page.goto("/");

	// Then the hero and cards fit within the mobile gutters.
	await expectNoHorizontalOverflow(page);
	await expectMobileGutters(page, 390);
	await expectHeaderSeparation(page);
	expect((await box(page.locator(".hero h1"))).width).toBeLessThan(360);
	const cards = page.locator(".card-grid").first().locator(":scope > li");
	const first = await box(cards.nth(0));
	const second = await box(cards.nth(1));
	expect(second.y, "mobile cards stack").toBeGreaterThan(
		first.y + first.height,
	);
	await page.getByRole("button", { name: "Open navigation" }).click();
	await expect(page.locator("#mobile-nav")).toBeVisible();
	await context.close();
});

test("home desktop cards form two columns and the header stays separate", async ({
	page,
}) => {
	// Given a wide desktop viewport with a light theme.
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.emulateMedia({ colorScheme: "light" });

	// When the home page is opened.
	await page.goto("/");

	// Then the header and cards fit their desktop layout.
	await expectNoHorizontalOverflow(page);
	await expectHeaderSeparation(page);
	const cards = page.locator(".card-grid").first().locator(":scope > li");
	const first = await box(cards.nth(0));
	const second = await box(cards.nth(1));
	expect(
		Math.abs(second.y - first.y),
		"desktop cards share a row",
	).toBeLessThan(2);
	expect(second.x, "desktop cards occupy separate columns").toBeGreaterThan(
		first.x + first.width,
	);
	await page.setViewportSize({ width: 671, height: 800 });
	const before = await box(cards.nth(0));
	const beforeNext = await box(cards.nth(1));
	expect(beforeNext.y, "cards stack below 42rem").toBeGreaterThan(
		before.y + before.height,
	);
	await page.setViewportSize({ width: 672, height: 800 });
	const after = await box(cards.nth(0));
	const afterNext = await box(cards.nth(1));
	expect(
		Math.abs(afterNext.y - after.y),
		"cards share a row at 42rem",
	).toBeLessThan(2);
	await page.getByRole("button", { name: "Dark theme" }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("Dreyfus essay keeps its reading measure at portrait desktop width", async ({
	page,
}) => {
	// Given the 1080 pixel portrait desktop viewport from the reported regression.
	await page.setViewportSize({ width: 1080, height: 1400 });

	// When the Dreyfus essay is opened.
	await page.goto("/essays/dreyfus-review/");

	// Then its prose has a readable measure and remains inside the page.
	await expectNoHorizontalOverflow(page);
	await expectHeaderSeparation(page);
	const prose = await box(page.locator("article.prose"));
	expect(prose.width, "desktop reading measure").toBeGreaterThan(650);
	expect(prose.width, "desktop reading measure").toBeLessThan(810);
	expect(
		prose.x,
		"prose starts inside the content gutter",
	).toBeGreaterThanOrEqual(40);
	expect(
		prose.x + prose.width,
		"prose ends inside the viewport",
	).toBeLessThanOrEqual(1040);
});

test("philosophy image aligns with mobile prose and selects enough pixels", async ({
	browser,
}) => {
	// Given a 412 pixel mobile viewport at a fractional device scale.
	const context = await browser.newContext({
		viewport: { width: 412, height: 915 },
		deviceScaleFactor: 1.5,
	});
	const page = await context.newPage();
	await page.emulateMedia({ colorScheme: "dark" });

	// When the philosophy essay and its image load.
	await page.goto("/essays/whatis-philosophy/");
	const image = page.locator("article.prose picture img").first();
	await image.scrollIntoViewIfNeeded();
	await expect(image).toHaveJSProperty("complete", true);

	// Then the image aligns with the prose and its selected file has enough pixels.
	await expectNoHorizontalOverflow(page);
	await expectMobileGutters(page, 412);
	const prose = await box(page.locator("article.prose"));
	const picture = await box(image);
	expect(
		Math.abs(picture.x - prose.x),
		"image and prose left edges align",
	).toBeLessThan(2);
	expect(
		Math.abs(picture.width - prose.width),
		"image and prose widths agree",
	).toBeLessThan(2);
	const pixels = await image.evaluate(async (element) => {
		const response = await fetch(element.currentSrc);
		const bitmap = await createImageBitmap(await response.blob());
		return {
			width: bitmap.width,
			rendered: element.getBoundingClientRect().width,
			dpr: window.devicePixelRatio,
		};
	});
	expect(
		pixels.width,
		"responsive candidate covers rendered width times DPR",
	).toBeGreaterThanOrEqual(pixels.rendered * pixels.dpr - 1);
	await context.close();
});

test("Connect4 figures and captions fit on mobile and desktop", async ({
	browser,
}) => {
	for (const width of [390, 1280]) {
		// Given a mobile or desktop viewport.
		const context = await browser.newContext({
			viewport: { width, height: 900 },
		});
		const page = await context.newPage();

		// When the project page is opened.
		await page.goto("http://127.0.0.1:4173/projects/connect4-lisp-web/");

		// Then each figure and caption stays in the project content column.
		await expectNoHorizontalOverflow(page);
		const content = await box(page.locator(".project-main"));
		const figure = await box(page.locator("figure").first());
		const caption = await box(page.locator("figure figcaption").first());
		expect(figure.x, "figure starts in content column").toBeGreaterThanOrEqual(
			content.x - 1,
		);
		expect(
			figure.x + figure.width,
			"figure fits content column",
		).toBeLessThanOrEqual(content.x + content.width + 1);
		expect(caption.x, "caption starts within figure").toBeGreaterThanOrEqual(
			figure.x - 1,
		);
		expect(
			caption.x + caption.width,
			"caption fits figure",
		).toBeLessThanOrEqual(figure.x + figure.width + 1);
		await context.close();
	}
});

test("short error page footer reaches the viewport bottom", async ({
	page,
}) => {
	// Given a tall desktop viewport.
	await page.setViewportSize({ width: 1280, height: 1000 });

	// When the short error page is opened.
	await page.goto("/404.html");

	// Then its footer follows the hero and the page fills the viewport.
	await expectNoHorizontalOverflow(page);
	const main = await box(page.locator("main"));
	const footer = await box(page.locator(".site-footer"));
	expect(
		footer.y + footer.height,
		"footer reaches viewport bottom",
	).toBeGreaterThanOrEqual(999);
	expect(
		Math.abs(footer.y - main.y - main.height),
		"footer directly follows the hero",
	).toBeLessThan(2);
});
