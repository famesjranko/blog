import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";

// Captures review evidence from an already deployed preview. It is a separate
// config so that no environment variable can point the local gate's
// playwright.config.ts away from dist/.
const { PLAYWRIGHT_BASE_URL = "" } = process.env;
const previewUrl = URL.parse(PLAYWRIGHT_BASE_URL);
if (previewUrl?.protocol !== "https:") {
	throw new Error(
		`PLAYWRIGHT_BASE_URL must be an https: URL, got "${PLAYWRIGHT_BASE_URL}"`,
	);
}
const outputDir = "test-results/preview";

// The preview is already served, so the local webServer is dropped.
const { webServer: _localServer, ...local } = base;

export default defineConfig({
	...local,
	outputDir,
	reporter: [["list"], ["json", { outputFile: `${outputDir}/results.json` }]],
	use: { ...local.use, baseURL: previewUrl.href },
});
