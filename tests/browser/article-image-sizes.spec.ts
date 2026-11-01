import { expect, test } from "@playwright/test";

// The `sizes` hint cannot follow the reading font, so a bound set too low
// would make the browser pick a rendition narrower than the drawn image.
// Essays and project pages lay out the column differently, so both are
// checked.
const routes = [
	{ name: "essay", path: "/essays/whatis-philosophy/" },
	{ name: "project", path: "/projects/musicmeta/" },
];

for (const { name, path } of routes) {
	for (const width of [768, 934, 1280]) {
		for (const dpr of [1, 1.25, 2]) {
			test(`${name} body images load enough pixels at ${width} pixels and DPR ${dpr}`, async ({
				browser,
			}) => {
				// Given a fresh browser context at this viewport and device scale.
				const context = await browser.newContext({
					viewport: { width, height: 900 },
					deviceScaleFactor: dpr,
				});
				const page = await context.newPage();

				// When the article and its body images load.
				await page.goto(path);
				const images = page.locator("article picture img");
				await expect(images.first()).toBeVisible();
				const loaded = await images.evaluateAll((elements) =>
					Promise.all(
						(elements as HTMLImageElement[]).map(async (element) => {
							await element.decode();
							const response = await fetch(element.currentSrc);
							const bitmap = await createImageBitmap(await response.blob());
							return {
								src: element.currentSrc,
								rendition: bitmap.width,
								source: Number(element.getAttribute("width")),
								needed:
									element.getBoundingClientRect().width *
									window.devicePixelRatio,
							};
						}),
					),
				);

				// Then each rendition is at least the box width times the DPR, or the whole source.
				expect(loaded.length).toBeGreaterThan(0);
				for (const image of loaded) {
					expect(
						image.rendition,
						`${image.src} covers its box at DPR ${dpr}`,
					).toBeGreaterThanOrEqual(Math.min(image.needed, image.source) - 1);
				}
				await context.close();
			});
		}
	}
}
