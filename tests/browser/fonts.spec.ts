import { expect, test } from "@playwright/test";

// Android maps the family name "Georgia" to its own serif. A web font
// declared as "Georgia" reproduces that here: the name resolves, but not
// to the Georgia font. Gelasio's italic file stands in because its glyph
// widths differ from the roman face the reading font should use.
const GEORGIA_ALIAS = `
	@font-face {
		font-family: Georgia;
		src: url("/fonts/gelasio-italic-v1.woff2") format("woff2");
	}
`;

test("reading text uses Gelasio when the name Georgia maps to another font", async ({
	page,
}) => {
	// Given a page where the family name Georgia maps to a different font.
	await page.goto("/");
	await page.addStyleTag({ content: GEORGIA_ALIAS });

	// When the same words are measured in the reading font, Gelasio and the alias.
	const widths = await page.evaluate(async () => {
		await Promise.all([
			document.fonts.load("40px Georgia"),
			document.fonts.load("40px Gelasio"),
		]);
		const measure = (family: string) => {
			const probe = document.createElement("span");
			probe.textContent = "From philosophy to software";
			probe.style.font = `400 40px ${family}`;
			// Out of flow, so the page layout cannot stretch it.
			probe.style.position = "absolute";
			probe.style.whiteSpace = "nowrap";
			document.body.append(probe);
			const width = probe.getBoundingClientRect().width;
			probe.remove();
			return width;
		};
		return {
			reading: measure("var(--font-reading)"),
			gelasio: measure("Gelasio"),
			alias: measure("Georgia"),
		};
	});

	// Then the alias really renders differently from Gelasio.
	expect(Math.abs(widths.alias - widths.gelasio)).toBeGreaterThan(5);
	// And the reading font skips the alias and renders as Gelasio.
	expect(widths.reading).toBeCloseTo(widths.gelasio, 0);
});
