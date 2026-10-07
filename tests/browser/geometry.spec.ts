import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, type Locator, type Page, test } from "@playwright/test";

async function attachMeasurement(name: string, value: object) {
	// Measurements run concurrently (see homeCards), so a counter read before
	// the await gives two calls one file; a random name cannot collide.
	const path = test.info().outputPath(`${name}-${randomUUID()}.json`);
	await writeFile(path, JSON.stringify(value, null, 2));
	await test.info().attach(name, { path, contentType: "application/json" });
}

async function box(locator: Locator) {
	const bounds = await locator.boundingBox();
	if (bounds === null) {
		throw new Error(`expected a visible box for ${locator}`);
	}
	await attachMeasurement("geometry-box", {
		locator: locator.toString(),
		bounds,
	});
	return bounds;
}

function homeCards(page: Page) {
	const cards = page.locator(".card-grid").first().locator(":scope > li");
	return Promise.all([box(cards.nth(0)), box(cards.nth(1))]);
}

async function expectNoHorizontalOverflow(page: Page) {
	const dimensions = await page.evaluate(() => ({
		viewport: window.innerWidth,
		content: document.documentElement.scrollWidth,
	}));
	await attachMeasurement("geometry-overflow", dimensions);
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
	const [first, second] = await homeCards(page);
	expect(second.y, "mobile cards stack").toBeGreaterThan(
		first.y + first.height,
	);
	await context.close();
});

test("home mobile navigation opens from its toggle", async ({ browser }) => {
	// Given the home page on a narrow touch viewport.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	await page.goto("/");
	const nav = page.locator("#mobile-nav");
	// And the mobile navigation starts closed.
	await expect(nav).toBeHidden();

	// When the navigation toggle is pressed.
	await page.getByRole("button", { name: "Open navigation" }).click();

	// Then the mobile navigation is visible.
	await expect(nav).toBeVisible();
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
	const [first, second] = await homeCards(page);
	expect(
		Math.abs(second.y - first.y),
		"desktop cards share a row",
	).toBeLessThan(2);
	expect(second.x, "desktop cards occupy separate columns").toBeGreaterThan(
		first.x + first.width,
	);
});

test("home cards stack one pixel below the 42rem breakpoint", async ({
	page,
}) => {
	// Given a 671 pixel viewport, one pixel narrower than 42rem.
	await page.setViewportSize({ width: 671, height: 800 });

	// When the home page is opened.
	await page.goto("/");

	// Then the second card sits below the first.
	const [first, second] = await homeCards(page);
	expect(second.y, "cards stack below 42rem").toBeGreaterThan(
		first.y + first.height,
	);
});

test("home cards share a row at the 42rem breakpoint", async ({ page }) => {
	// Given a 672 pixel viewport, exactly 42rem wide.
	await page.setViewportSize({ width: 672, height: 800 });

	// When the home page is opened.
	await page.goto("/");

	// Then the first two cards share a row.
	const [first, second] = await homeCards(page);
	expect(
		Math.abs(second.y - first.y),
		"cards share a row at 42rem",
	).toBeLessThan(2);
});

test("project card topics sit at the bottom of every card", async ({
	page,
}) => {
	// Given a desktop viewport where project cards share rows.
	await page.setViewportSize({ width: 1280, height: 800 });

	// When the projects index is opened.
	await page.goto("/projects/");

	// Then each card's topics end the same distance above its bottom edge.
	const gaps = await page
		.locator(".card")
		.evaluateAll((cards) =>
			cards.map(
				(card) =>
					card.getBoundingClientRect().bottom -
					(card.querySelector(".entry-meta")?.getBoundingClientRect().bottom ??
						Number.NaN),
			),
		);
	await attachMeasurement("topic-gaps", { gaps });
	expect(gaps.length, "projects index has cards").toBeGreaterThan(1);
	expect(
		Math.max(...gaps) - Math.min(...gaps),
		"topics align to card bottoms",
	).toBeLessThan(2);
});

test("theme toggle switches a light page to the dark theme", async ({
	page,
}) => {
	// Given the home page in a light colour scheme.
	await page.emulateMedia({ colorScheme: "light" });
	await page.goto("/");
	const html = page.locator("html");
	// And the page does not use the dark theme.
	await expect(html).not.toHaveAttribute("data-theme", "dark");

	// When the theme toggle is pressed.
	await page.getByRole("button", { name: "Dark theme" }).click();

	// Then the page uses the dark theme.
	await expect(html).toHaveAttribute("data-theme", "dark");
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
	const pixels = await image.evaluate(async (element: HTMLImageElement) => {
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

for (const width of [390, 1280]) {
	test(`Connect4 figure and caption fit the content column at ${width} pixels`, async ({
		page,
	}) => {
		// Given a viewport of the stated width.
		await page.setViewportSize({ width, height: 900 });

		// When the Connect4 project page is opened.
		await page.goto("/projects/connect4-lisp-web/");

		// Then the first figure stays in the project content column.
		await expectNoHorizontalOverflow(page);
		const content = await box(page.locator(".project-main"));
		const figure = await box(page.locator("figure").first());
		expect(figure.x, "figure starts in content column").toBeGreaterThanOrEqual(
			content.x - 1,
		);
		expect(
			figure.x + figure.width,
			"figure fits content column",
		).toBeLessThanOrEqual(content.x + content.width + 1);
		// And its caption stays within the figure.
		const caption = await box(page.locator("figure figcaption").first());
		expect(caption.x, "caption starts within figure").toBeGreaterThanOrEqual(
			figure.x - 1,
		);
		expect(
			caption.x + caption.width,
			"caption fits figure",
		).toBeLessThanOrEqual(figure.x + figure.width + 1);
	});
}

test("a wide markdown table scrolls inside the column on a phone", async ({
	page,
}) => {
	// Given a phone-width viewport.
	await page.setViewportSize({ width: 360, height: 800 });

	// When the PDF tables article with its six-column results table is opened.
	await page.goto("/projects/extracting-pdf-tables/");

	// Then the page itself does not scroll sideways.
	await expectNoHorizontalOverflow(page);
	// And the table's hidden columns can still be reached inside its container.
	const scroller = page.locator(".prose table").first().locator("..");
	const scroll = await scroller.evaluate((element) => ({
		visible: element.clientWidth,
		content: element.scrollWidth,
	}));
	expect(scroll.content, "table scrolls within its container").toBeGreaterThan(
		scroll.visible,
	);
});

test("short error page fills a tall viewport with hero and footer", async ({
	page,
}) => {
	// Given a desktop viewport taller than the error page content.
	await page.setViewportSize({ width: 1280, height: 2000 });

	// When the short error page is opened.
	await page.goto("/404.html");

	// Then its footer reaches the viewport bottom.
	await expectNoHorizontalOverflow(page);
	const hero = await box(page.locator(".hero"));
	const footer = await box(page.locator(".site-footer"));
	expect(
		footer.y + footer.height,
		"footer reaches viewport bottom",
	).toBeGreaterThanOrEqual(1999);
	// And the hero reaches down to the footer with no gap.
	expect(
		Math.abs(footer.y - hero.y - hero.height),
		"footer directly follows the hero",
	).toBeLessThan(2);
});

test("note cover images open their article", async ({ page }) => {
	// Given the notes index and its first linked cover image.
	await page.goto("/notes/");
	const cover = page.locator(".note-cover-link").first();
	const href = await cover.getAttribute("href");
	if (href === null) {
		throw new Error("expected the note cover to have a destination");
	}

	// When the image itself is clicked.
	await cover.locator("img").click();

	// Then the browser opens that note article.
	expect(page.url()).toContain(href);
});
