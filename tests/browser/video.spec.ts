import { expect, type Page, test } from "@playwright/test";

const PLAYER = "https://player.example/embed/1";
const WATCH_PAGE = "https://video.example/watch/1";

/** Serve one article holding a video poster, run by the site's own script. */
async function openPosterPage(page: Page): Promise<string[]> {
	const providerRequests: string[] = [];
	await page.route("https://player.example/**", (route) => {
		providerRequests.push(route.request().url());
		return route.fulfill({ contentType: "text/html", body: "<p>player</p>" });
	});
	await page.route("**/video-test/", (route) =>
		route.fulfill({
			contentType: "text/html",
			body: `<!doctype html><html lang="en"><body><article class="prose"><figure class="video-embed"><a class="video-poster" href="${WATCH_PAGE}" data-embed="${PLAYER}"><img src="/favicon.svg" alt="A test film"><span class="video-badge" aria-hidden="true">1:00</span></a></figure></article><script src="/js/video-embed.js"></script></body></html>`,
		}),
	);
	await page.goto("/video-test/");
	return providerRequests;
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

	// When the reader clicks the poster.
	await page.locator(".video-poster").click();

	// Then the provider's player takes the poster's place in the figure.
	const player = page.locator("figure.video-embed iframe");
	await expect(player).toHaveAttribute("src", PLAYER);
	await expect(player).toHaveAttribute("title", "A test film");
	await expect(page.locator(".video-poster")).toHaveCount(0);
	// And the page stayed put instead of following the link.
	expect(page.url()).toMatch(/\/video-test\/$/);
	await expect.poll(() => providerRequests).toEqual([PLAYER]);
});
