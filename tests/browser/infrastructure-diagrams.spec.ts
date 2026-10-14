import { expect, type Locator, test } from "@playwright/test";

// Surface, accent, muted and diagram-x tokens from styles/main.css, plus the
// lowered dark teal from styles/infrastructure-diagrams.css. Icons are
// grouped by kind: teal hardware, accent-green software and VMs, muted ink
// for things outside the lab.
const themes = [
	{
		name: "light",
		fill: "rgb(255, 255, 255)",
		strokes: {
			hardware: "rgb(12, 116, 133)",
			virtual: "rgb(26, 115, 89)",
			software: "rgb(26, 115, 89)",
			external: "rgb(77, 77, 77)",
		},
	},
	{
		name: "dark",
		fill: "rgb(28, 28, 28)",
		strokes: {
			hardware: "rgb(95, 195, 214)",
			virtual: "rgb(147, 184, 169)",
			software: "rgb(147, 184, 169)",
			external: "rgb(168, 168, 168)",
		},
	},
];
const kinds = Object.keys(themes[0]?.strokes ?? {});
const widths = [320, 390, 1280];

async function expectLegibleLabels(drawing: Locator): Promise<void> {
	const metrics = await drawing.evaluate((element) => {
		const svg = element as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		return Array.from(svg.querySelectorAll("text"), (label) => {
			const rect = label.getBoundingClientRect();
			const matrix = label.getScreenCTM();
			return {
				text: label.textContent,
				size:
					Number.parseFloat(getComputedStyle(label).fontSize) *
					Math.hypot(matrix?.a ?? 0, matrix?.b ?? 0),
				inside:
					rect.left >= bounds.left &&
					rect.right <= bounds.right &&
					rect.top >= bounds.top &&
					rect.bottom <= bounds.bottom,
			};
		});
	});

	// Then labels are legible and contained, with an accessible name.
	for (const metric of metrics) {
		expect(metric.size, metric.text ?? "label").toBeGreaterThanOrEqual(14);
		expect(metric.inside, metric.text ?? "label").toBe(true);
	}
}

async function expectGroupedPalette(
	figures: Locator,
	theme: (typeof themes)[number],
): Promise<void> {
	const devices = await figures.locator("svg:visible .device").evaluateAll(
		(elements, names) =>
			elements.map((element) => ({
				kind: names.find((name) =>
					element.classList.contains(`device-${name}`),
				),
				fill: getComputedStyle(element).fill,
				stroke: getComputedStyle(element).stroke,
			})),
		kinds,
	);

	// Then every icon kind appears, filled with the surface and stroked in
	// its group's hue.
	expect(new Set(devices.map((device) => device.kind))).toEqual(new Set(kinds));
	for (const device of devices) {
		const kind = device.kind ?? "";
		expect(device, kind).toEqual({
			kind,
			fill: theme.fill,
			stroke: theme.strokes[kind as keyof typeof theme.strokes],
		});
	}
}

async function expectAttachedFigure(figure: Locator): Promise<void> {
	const alignment = await figure.evaluate((element) => {
		const drawing = Array.from(element.querySelectorAll("svg")).find(
			(svg) => getComputedStyle(svg).display !== "none",
		);
		const caption = element.querySelector("figcaption");
		const prose = element.closest(".prose");
		return {
			left: element.getBoundingClientRect().left,
			proseLeft: prose?.getBoundingClientRect().left,
			gap:
				(caption?.getBoundingClientRect().top ?? 0) -
				(drawing?.getBoundingClientRect().bottom ?? 0),
		};
	});
	expect(alignment.left).toBe(alignment.proseLeft);
	expect(alignment.gap).toBeGreaterThan(0);
	expect(alignment.gap).toBeLessThan(24);
}

for (const theme of themes) {
	for (const width of widths) {
		test(`readable complete diagrams at ${width}px in ${theme.name}`, async ({
			page,
		}) => {
			// Given the built article at a real reading width and selected theme.
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/ai-engineering/ai-infrastructure/");
			await page.evaluate((name) => {
				document.documentElement.setAttribute("data-theme", name);
			}, theme.name);
			const figures = page.locator("figure.infra-responsive");

			// When the browser renders each logical figure and its visible labels.
			await expect(figures).toHaveCount(2);
			for (const figure of await figures.all()) {
				const drawing = figure.locator("svg:visible");
				await expect(drawing).toHaveCount(1);
				await expect(figure.locator("figcaption")).toHaveCount(1);
				await expectLegibleLabels(drawing);
				await expectAttachedFigure(figure);
				const ids =
					(await drawing.getAttribute("aria-labelledby"))?.split(" ") ?? [];
				expect(ids).toHaveLength(2);
				for (const id of ids) {
					await expect(drawing.locator(`[id="${id}"]`)).not.toBeEmpty();
				}
				const hidden = figure.locator("svg:not(:visible)");
				await hidden.evaluate((element) => (element as SVGElement).focus());
				await expect(hidden).not.toBeFocused();
			}
			expect(
				await page.evaluate(
					() => document.documentElement.scrollWidth <= innerWidth,
				),
			).toBe(true);
			await expectGroupedPalette(figures, theme);
		});
	}

	for (const width of [599, 600, 601]) {
		test(`figure width selects layout at ${width}px in ${theme.name}`, async ({
			page,
		}) => {
			// Given a desktop viewport with a constrained article figure.
			await page.setViewportSize({ width: 1280, height: 900 });
			await page.goto("/ai-engineering/ai-infrastructure/");
			await page.evaluate(
				({ width, theme }) => {
					document.documentElement.setAttribute("data-theme", theme);
					for (const figure of document.querySelectorAll<HTMLElement>(
						"figure.infra-responsive",
					)) {
						figure.style.width = `${width}px`;
					}
				},
				{ width, theme: theme.name },
			);

			// When the figure's own width crosses the container threshold.
			const expected = width < 600 ? "infra-narrow" : "infra-wide";
			const figures = page.locator("figure.infra-responsive");

			// Then each figure exposes only its selected drawing, including in zoom.
			for (const figure of await figures.all()) {
				const drawing = figure.locator("svg:visible");
				await expect(drawing).toHaveCount(1);
				await expect(drawing).toHaveClass(new RegExp(expected));
				const minimum = await drawing.evaluate((element) =>
					Math.min(
						...Array.from(
							element.querySelectorAll("text"),
							(label) =>
								Number.parseFloat(getComputedStyle(label).fontSize) *
								(label.getScreenCTM()?.a ?? 0),
						),
					),
				);
				expect(minimum).toBeGreaterThanOrEqual(14);
				await drawing.focus();
				await page.keyboard.press("Enter");
				await expect(page.locator("dialog[open] svg")).toBeVisible();
				await expect(page.locator("dialog[open] svg")).toHaveClass(
					new RegExp(expected),
				);
				await page.keyboard.press("Escape");
			}
		});
	}
}
