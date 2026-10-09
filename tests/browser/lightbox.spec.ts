import { expect, test } from "@playwright/test";

test("article images, cover, and diagrams become zoomable", async ({
	page,
}) => {
	// Given a project with screenshots, a project with diagrams, and a
	// standalone page with both.
	const pages = [
		"/projects/tablescan/",
		"/projects/connect4-heuristic/",
		"/agentic-engineering/",
	];

	for (const path of pages) {
		// When the article loads.
		await page.goto(path);

		// Then every body image, the cover included, and every diagram is a zoom button.
		const targets = page.locator(".prose img, .prose svg.diagram");
		expect(await targets.count()).toBeGreaterThan(1);
		await expect(
			targets.and(page.locator(".zoomable[role=button]")),
		).toHaveCount(await targets.count());
	}
});

test("a click shows the source image and a second click closes it", async ({
	page,
}) => {
	// Given a project page with a screenshot served through picture renditions.
	await page.goto("/projects/tablescan/");
	const screenshot = page.locator(".prose figure img").first();
	const dialog = page.locator("dialog.lightbox");

	// When the screenshot is clicked.
	await screenshot.click();

	// Then the dialog shows the original JPEG, not a rendition.
	await expect(dialog).toBeVisible();
	await expect(dialog.locator("img")).toHaveAttribute(
		"src",
		"/img/projects/tablescan/upload.jpg",
	);
	// And the page behind it does not scroll.
	expect(
		await page.evaluate(
			() => getComputedStyle(document.documentElement).overflow,
		),
	).toBe("hidden");

	// When the overlay is clicked.
	await dialog.click();

	// Then the dialog closes.
	await expect(dialog).toBeHidden();
});

test("the keyboard opens an image and returns focus when it closes", async ({
	page,
}) => {
	// Given an essay whose cover image has keyboard focus.
	await page.goto("/essays/plato-allegory/");
	const cover = page.locator(".prose .article-cover-image");
	const dialog = page.locator("dialog.lightbox");
	await cover.focus();

	// When Enter is pressed.
	await page.keyboard.press("Enter");

	// Then the dialog opens on the cover.
	await expect(dialog).toBeVisible();
	await expect(dialog.locator("img")).toHaveAttribute(
		"src",
		"/img/essays/plato-allegory/cover.jpg",
	);

	// When Escape is pressed.
	await page.keyboard.press("Escape");

	// Then the dialog closes.
	await expect(dialog).toBeHidden();
	// And focus is back on the cover.
	await expect(cover).toBeFocused();
});

test("an enlarged diagram keeps its label without duplicating ids", async ({
	page,
}) => {
	// Given a project page with inline Connect-4 diagrams.
	await page.goto("/projects/connect4-heuristic/");
	const diagram = page.locator(".prose svg.diagram").first();
	const label = await diagram.evaluate((element) =>
		(element.getAttribute("aria-labelledby") ?? "")
			.split(" ")
			.map((id) => document.getElementById(id)?.textContent?.trim())
			.join(" "),
	);

	// When the first diagram is opened.
	await diagram.click();

	// Then the copy has the same accessible name as the original.
	await expect(page.locator("dialog.lightbox svg")).toHaveAccessibleName(label);
	// And no id in the document appears twice.
	const duplicates = await page.evaluate(() => {
		const ids = [...document.querySelectorAll("[id]")].map(
			(element) => element.id,
		);
		return ids.filter((id, index) => ids.indexOf(id) !== index);
	});
	expect(duplicates).toEqual([]);
});

test("a tapped diagram shows no focus ring after the dialog closes", async ({
	browser,
}) => {
	// Given a touch phone on a page with inline diagrams.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	await page.goto("/projects/connect4-heuristic/");
	const diagram = page.locator(".prose svg.diagram").first();

	// When the diagram is tapped open and the overlay is tapped closed.
	await diagram.tap();
	await page.locator("dialog.lightbox").tap();

	// Then the diagram has focus back but draws no outline.
	await expect(diagram).toBeFocused();
	await expect(diagram).toHaveCSS("outline-style", "none");
	await context.close();
});
