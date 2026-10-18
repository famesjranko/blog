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
