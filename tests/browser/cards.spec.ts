import { expect, test } from "@playwright/test";

// Notes render as `.note-row`; every other list uses `.card`.
const routes = [
	{
		path: "/essays/",
		card: ".card",
		title: ".card-title",
		desc: ".entry-desc",
	},
	{
		path: "/notes/",
		card: ".note-row",
		title: ".note-title",
		desc: ".note-desc",
	},
	{
		path: "/projects/",
		card: ".card",
		title: ".card-title",
		desc: ".entry-desc",
	},
	{
		path: "/ai-engineering/",
		card: ".card",
		title: ".card-title",
		desc: ".entry-desc",
	},
	{
		path: "/topics/heidegger/",
		card: ".card",
		title: ".card-title",
		desc: ".entry-desc",
	},
];

type Spacing = { titleToDesc: number; descToBottom: number };
type Selectors = { title: string; desc: string };

// Runs in the page. Text boxes, not element boxes: a reserved min-height leaves
// the element tall but its text short. Lines clamped out of view are skipped.
function measureCards(cards: Element[], sel: Selectors): Spacing[] {
	const lines = (node: Element) => {
		const range = document.createRange();
		range.selectNodeContents(node);
		const limit = node.getBoundingClientRect().bottom - 1;
		return [...range.getClientRects()].filter((r) => r.top < limit);
	};
	return cards.map((el) => {
		const titleEl = el.querySelector(sel.title);
		const descEl = el.querySelector(sel.desc);
		if (!titleEl || !descEl) {
			throw new Error("card lacks title or desc");
		}
		// Project cards end with an origin line below the description.
		const endEl = el.querySelector(".entry-meta") ?? descEl;
		return {
			titleToDesc:
				Math.min(...lines(descEl).map((r) => r.top)) -
				Math.max(...lines(titleEl).map((r) => r.bottom)),
			descToBottom:
				el.getBoundingClientRect().bottom -
				Math.max(...lines(endEl).map((r) => r.bottom)),
		};
	});
}

test.describe("narrow screen", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	for (const { path, card, title, desc } of routes) {
		test(`cards on ${path} reserve no empty space`, async ({ page }) => {
			// Given a phone-width viewport on a list page.
			await page.goto(path);

			// When I measure, on every card, the text gaps around the description.
			const spacing = await page
				.locator(card)
				.evaluateAll(measureCards, { title, desc });

			// Then there are several cards and both gaps match on all of them within 1px.
			expect(spacing.length, `cards found on ${path}`).toBeGreaterThan(1);
			for (const key of ["titleToDesc", "descToBottom"] as const) {
				const values = spacing.map((s) => s[key]);
				const spread = Math.max(...values) - Math.min(...values);
				expect(
					spread,
					`${path} ${key}: ${values.join(", ")}`,
				).toBeLessThanOrEqual(1);
			}
		});
	}
});

test.describe("small phone", () => {
	test.use({ viewport: { width: 360, height: 800 } });

	for (const { path, desc } of routes.slice(0, 4)) {
		test(`descriptions on ${path} are not cut off`, async ({ page }) => {
			// Given a 360px-wide viewport on a list page.
			await page.goto(path);

			// When I read every description's content height against its visible height.
			const boxes = await page.locator(desc).evaluateAll((els) =>
				els.map((el) => ({
					text: el.textContent?.slice(0, 40) ?? "",
					hidden: el.scrollHeight - el.clientHeight,
				})),
			);

			// Then there are several descriptions and none hides a line within 1px.
			expect(boxes.length, `descriptions found on ${path}`).toBeGreaterThan(1);
			for (const { text, hidden } of boxes) {
				expect(
					hidden,
					`${path} "${text}" hides ${hidden}px`,
				).toBeLessThanOrEqual(1);
			}
		});
	}
});

test.describe("wide screen", () => {
	test.use({ viewport: { width: 1080, height: 900 } });

	test("cards sharing a row on /essays/ keep one height and one description line", async ({
		page,
	}) => {
		// Given a desktop-width viewport on the essays list.
		await page.goto("/essays/");

		// When I measure every card, with its row, height and description start.
		const cards = await page.locator(".card").evaluateAll((els) =>
			els.map((el) => {
				const box = el.getBoundingClientRect();
				const desc = el.querySelector(".entry-desc");
				if (!desc) {
					throw new Error("card lacks desc");
				}
				return {
					row: Math.round(box.top),
					height: box.height,
					descTop: desc.getBoundingClientRect().top - box.top,
				};
			}),
		);

		// Then in every row the cards are equally tall and their descriptions start together.
		const rows = new Map<number, typeof cards>();
		for (const c of cards) {
			rows.set(c.row, [...(rows.get(c.row) ?? []), c]);
		}
		expect(rows.size, "rows found").toBeGreaterThan(1);
		for (const [row, members] of rows) {
			const heights = members.map((c) => c.height);
			const starts = members.map((c) => c.descTop);
			const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
			expect(
				spread(heights),
				`row ${row} heights ${heights}`,
			).toBeLessThanOrEqual(1);
			expect(
				spread(starts),
				`row ${row} description starts ${starts}`,
			).toBeLessThanOrEqual(1);
		}
	});
});
