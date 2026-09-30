import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests/browser",
	outputDir: join(tmpdir(), "blog-playwright-results"),
	fullyParallel: true,
	workers: process.env.CI ? 1 : undefined,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		browserName: "chromium",
	},
	webServer: {
		command: "node tests/browser/serve.mjs",
		url: "http://127.0.0.1:4173/",
		reuseExistingServer: false,
		timeout: 15_000,
	},
});
