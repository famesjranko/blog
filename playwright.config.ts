import { defineConfig } from "@playwright/test";

// One port feeds the server, baseURL, and readiness probe, so separate
// checkouts can run the browser checks side by side on different ports.
const { CI, PLAYWRIGHT_PORT = "4173" } = process.env;
const port = Number(PLAYWRIGHT_PORT);
if (!/^\d+$/.test(PLAYWRIGHT_PORT) || port < 1 || port > 65535) {
	throw new Error(
		`PLAYWRIGHT_PORT must be an integer from 1 to 65535, got "${PLAYWRIGHT_PORT}"`,
	);
}
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
	testDir: "tests/browser",
	fullyParallel: true,
	...(CI ? { workers: 1 } : {}),
	retries: 0,
	reporter: "list",
	use: {
		baseURL: origin,
		browserName: "chromium",
	},
	webServer: {
		command: `node tests/browser/serve.mjs ${port}`,
		url: `${origin}/`,
		reuseExistingServer: false,
		timeout: 15_000,
	},
});
