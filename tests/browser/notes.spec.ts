import { expect, type Page, test } from "@playwright/test";

/** The first note's cover and text boxes. */
async function firstNote(page: Page) {
	const note = page.locator(".note-row").first();
	const cover = await note.locator(".note-cover-link").boundingBox();
	const text = await note.locator(".note-text").boundingBox();
	if (cover === null || text === null) {
		throw new Error("expected the first note to show its cover and text");
	}
	return { cover, text };
}

test("notes below the 42rem breakpoint stack the cover above the text", async ({
	page,
}) => {
	// Given a viewport one pixel narrower than the 42rem breakpoint.
	await page.setViewportSize({ width: 671, height: 800 });

	// When the notes index is opened.
	await page.goto("/notes/");

	// Then the first note's cover sits above its text.
	const { cover, text } = await firstNote(page);
	expect(cover.y + cover.height, "cover above text").toBeLessThanOrEqual(
		text.y + 1,
	);
});

test("notes from the 42rem breakpoint are rows with the cover beside the text", async ({
	page,
}) => {
	// Given a viewport exactly as wide as the 42rem breakpoint.
	await page.setViewportSize({ width: 672, height: 800 });

	// When the notes index is opened.
	await page.goto("/notes/");

	// Then the first note's cover sits to the right of its text.
	const { cover, text } = await firstNote(page);
	expect(cover.x, "cover beside text").toBeGreaterThanOrEqual(
		text.x + text.width,
	);
});

test("a tap on a note card's description opens the note on a phone", async ({
	browser,
}) => {
	// Given the notes index on a touch phone.
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	const page = await context.newPage();
	await page.goto("/notes/");
	const note = page.locator(".note-row").first();
	const href = await note.locator(".note-title a").getAttribute("href");
	const description = await note.locator(".note-desc").boundingBox();
	if (href === null || description === null) {
		throw new Error("expected the first note to have a link and description");
	}

	// When the middle of the description is tapped.
	await page.touchscreen.tap(
		description.x + description.width / 2,
		description.y + description.height / 2,
	);

	// Then the browser opens that note.
	await page.waitForURL((url) => url.pathname === href);
	await context.close();
});

test("only the footer rule closes the desktop notes list", async ({ page }) => {
	// Given a desktop viewport.
	await page.setViewportSize({ width: 1080, height: 900 });

	// When the notes index is opened.
	await page.goto("/notes/");

	// Then every row but the last draws a bottom rule.
	const rules = await page
		.locator(".note-row")
		.evaluateAll((rows) =>
			rows.map((row) => getComputedStyle(row).borderBottomWidth),
		);
	expect(rules.length, "notes index has notes").toBeGreaterThan(1);
	expect(rules.slice(0, -1).every((width) => width === "1px")).toBe(true);
	expect(rules.at(-1), "last row has no rule above the footer").toBe("0px");
});
