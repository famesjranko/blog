import { expect, test } from "@playwright/test";

test("a hyphenated word in a balanced heading stays on one line", async ({
	page,
}) => {
	// Given the Connect-4 project page on a narrow phone viewport.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/projects/connect4-lisp-web/");

	// When the lines that "Connect-4" occupies in the heading are counted.
	const lines = await page.locator("h1").evaluate((heading) => {
		const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const at = node.textContent?.indexOf("Connect-4") ?? -1;
			if (at >= 0) {
				const range = document.createRange();
				range.setStart(node, at);
				range.setEnd(node, at + "Connect-4".length);
				return new Set([...range.getClientRects()].map((r) => r.top)).size;
			}
		}
		return 0;
	});

	// Then the word sits on exactly one line.
	expect(lines).toBe(1);
});
