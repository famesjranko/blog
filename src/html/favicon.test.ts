import { afterEach, expect, it, vi } from "vitest";
import { page } from "./layout.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

it.each(["", "/blog"])(
	"provides raster icons for tabs and shortcuts under '%s'",
	(basePath) => {
		// Given the site is served at the specified base path.
		vi.stubEnv("BASE_PATH", basePath);

		// When a page is rendered.
		const html = page({ title: "Andrew J. McDonald", content: "" });

		// Then browsers can find each raster icon at its advertised size.
		expect(html).toContain(
			`<link rel="icon" type="image/png" sizes="32x32" href="${basePath}/favicon-32.png">`,
		);
		expect(html).toContain(
			`<link rel="icon" type="image/png" sizes="192x192" href="${basePath}/favicon-192.png">`,
		);
		expect(html).toContain(
			`<link rel="apple-touch-icon" sizes="180x180" href="${basePath}/apple-touch-icon.png">`,
		);
	},
);
