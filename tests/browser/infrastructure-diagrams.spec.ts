import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const workbench = readFile(
	"static/img/ai-engineering/ai-infrastructure/workbench.svg",
	"utf8",
);
const styles = Promise.all(
	["main", "prose", "diagrams", "infrastructure-diagrams", "figures"].map(
		(name) => readFile(`styles/${name}.css`, "utf8"),
	),
);

// Surface and text tokens in styles/main.css define the device contrast.
const themes = [
	{ name: "light", fill: "rgb(255, 255, 255)", stroke: "rgb(22, 22, 22)" },
	{ name: "dark", fill: "rgb(28, 28, 28)", stroke: "rgb(236, 236, 236)" },
];

for (const theme of themes) {
	test(`all homelab devices have surface interiors and visible outlines in ${theme.name}`, async ({
		page,
	}) => {
		// Given the real workbench artwork and site styles in an article.
		await page.setContent(
			`<html data-theme="${theme.name}"><body><article class="prose">${await workbench}</article></body></html>`,
		);
		await page.addStyleTag({ content: (await styles).join("\n") });
		const devices = page.locator("article svg use");

		// When the browser renders all four topology device instances.
		const rendered = await devices.evaluateAll((instances) =>
			instances.map((instance) => ({
				href: instance.getAttribute("href"),
				fill: getComputedStyle(instance).fill,
				stroke: getComputedStyle(instance).stroke,
			})),
		);

		// Then every expected device has the theme's contrasting fill and stroke.
		expect(rendered).toHaveLength(4);
		expect(rendered).toEqual(
			["#d-laptop", "#d-vm", "#d-vm", "#d-nas"].map((href) => ({
				href,
				fill: theme.fill,
				stroke: theme.stroke,
			})),
		);
	});
}
