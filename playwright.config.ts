import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

const resultsDir =
	process.env.PLAYWRIGHT_RESULTS_DIR ??
	join(tmpdir(), "blog-playwright-results");
const previewUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
	testDir: "tests/browser",
	outputDir: resultsDir,
	fullyParallel: true,
	workers: process.env.CI ? 1 : undefined,
	retries: 0,
	reporter: previewUrl
		? [["list"], ["json", { outputFile: join(resultsDir, "results.json") }]]
		: "list",
	use: {
		baseURL: previewUrl ?? "http://127.0.0.1:4173",
		browserName: "chromium",
	},
	webServer: previewUrl
		? undefined
		: {
				command: "node tests/browser/serve.mjs",
				url: "http://127.0.0.1:4173/",
				reuseExistingServer: false,
				timeout: 15_000,
			},
});
