import { expect, type Page, test } from "@playwright/test";

const PLAYER = "https://player.example/embed/1";
const WATCH_PAGE = "https://video.example/watch/1";

/** Serve one article holding a video poster, run by the site's own script. */
async function openPosterPage(page: Page): Promise<string[]> {
	const providerRequests: string[] = [];
	await page.context().route("https://player.example/**", (route) => {
		providerRequests.push(route.request().url());
		return route.fulfill({ contentType: "text/html", body: "<p>player</p>" });
	});
	await page
		.context()
		.route("https://video.example/**", (route) =>
			route.fulfill({ contentType: "text/html", body: "<p>watch page</p>" }),
		);
	await page.route("**/video-test/", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<!doctype html><html lang="en"><body><article class="prose"><figure class="video-embed"><a class="video-poster" href="${WATCH_PAGE}" target="_blank" rel="noopener noreferrer" data-embed="${PLAYER}"><img src="/favicon.svg" alt="A test film"><span class="video-badge" aria-hidden="true">1:00</span></a></figure></article><script src="/js/video-embed.js"></script></body></html>`,
		}),
	);
	await page.goto("/video-test/");
	return providerRequests;
}

/** Resolve true if a new tab opens within a short window, false otherwise. */
function opensTab(page: Page): Promise<boolean> {
	return page
		.context()
		.waitForEvent("page", { timeout: 1500 })
		.then(
			() => true,
			() => false,
		);
}

test("a video poster loads nothing from the provider before a click", async ({
	page,
}) => {
	// Given an article with a video poster.
	const providerRequests = await openPosterPage(page);

	// When the page has loaded and no one has clicked.
	await page.waitForLoadState("load");

	// Then the poster is still a link to the provider's page.
	await expect(page.locator(".video-poster")).toHaveAttribute(
		"href",
		WATCH_PAGE,
	);
	// And no player exists and nothing was requested from the provider.
	await expect(page.locator("iframe")).toHaveCount(0);
	expect(providerRequests).toEqual([]);
});

test("a click swaps the poster for the provider's player", async ({ page }) => {
	// Given an article with a video poster.
	const providerRequests = await openPosterPage(page);
	const newTab = opensTab(page);

	// When the reader clicks the poster.
	await page.locator(".video-poster").click();

	// Then the provider's player takes the poster's place in the figure.
	const player = page.locator("figure.video-embed iframe");
	await expect(player).toHaveAttribute("src", PLAYER);
	await expect(player).toHaveAttribute("title", "A test film");
	await expect(player).toHaveAttribute("allow", /\bautoplay\b/);
	await expect(page.locator(".video-poster")).toHaveCount(0);
	// And the link did not also open the provider's page in a new tab.
	expect(await newTab).toBe(false);
	await expect.poll(() => providerRequests).toEqual([PLAYER]);
});

test("a modifier click opens the provider's page and keeps the poster", async ({
	page,
}) => {
	// Given an article with a video poster.
	const providerRequests = await openPosterPage(page);
	const newTab = opensTab(page);

	// When the reader Ctrl- or Cmd-clicks the poster.
	await page.locator(".video-poster").click({ modifiers: ["ControlOrMeta"] });

	// Then the provider's page opens in a new tab.
	expect(await newTab).toBe(true);
	// And the poster stays, with no player and no request to the player.
	await expect(page.locator(".video-poster")).toHaveCount(1);
	await expect(page.locator("iframe")).toHaveCount(0);
	expect(providerRequests).toEqual([]);
});

test("Enter on the poster moves focus into the player", async ({ page }) => {
	// Given an article with a video poster that has keyboard focus.
	await openPosterPage(page);
	await page.locator(".video-poster").focus();

	// When the reader presses Enter.
	await page.keyboard.press("Enter");

	// Then the player replaces the poster and holds the focus.
	await expect(page.locator("figure.video-embed iframe")).toBeFocused();
});
