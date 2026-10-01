import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { main } from "./preview-comment.ts";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => {
	globalThis.fetch = originalFetch;
	process.env = { ...originalEnv };
});

test.each(["passed", "failed", "skipped"] as const)(
	"publishes the current head's %s capture outcome",
	async (status) => {
		// Given a current head and the capture outcome passed by the workflow.
		const sha = "b".repeat(40);
		process.env = {
			GH_TOKEN: "token",
			GH_REPOSITORY: "o/r",
			PR_NUMBER: "7",
			PR_HEAD_SHA: sha,
			PREVIEW_CAPTURE_STATUS: status,
			...(status === "passed"
				? {
						PREVIEW_URL: "https://abc12345.site.pages.dev",
						ARTIFACT_URL: "https://github.com/o/r/actions/runs/1/artifacts/2",
						PLAYWRIGHT_SUMMARY:
							"1/1 browser tests passed; 1 viewport measurements; maximum horizontal overflow 0 px.",
					}
				: {}),
		};
		let posted = "";
		globalThis.fetch = async (_url, options) => {
			if (options?.method === "POST") {
				posted = JSON.parse(String(options.body)).body;
				return new Response("{}", { status: 201 });
			}
			return new Response("[]");
		};

		// When the comment entrypoint runs.
		await main();

		// Then its comment identifies this head and its actual outcome.
		assert.match(posted, new RegExp(sha));
		assert.match(posted, new RegExp(`- Outcome: ${status}`));
		if (status === "passed") {
			assert.match(posted, /artifacts\/2/);
			assert.match(posted, /1\/1 browser tests passed/);
		} else {
			assert.doesNotMatch(posted, /Capture artifact:|Measurements:/);
		}
	},
);

function validInputs(): void {
	process.env = {
		GH_TOKEN: "token",
		GH_REPOSITORY: "o/r",
		PR_NUMBER: "7",
		PR_HEAD_SHA: "b".repeat(40),
		PREVIEW_CAPTURE_STATUS: "passed",
		PREVIEW_URL: "https://abc12345.site.pages.dev",
		ARTIFACT_URL: "https://github.com/o/r/actions/runs/1/artifacts/2",
		PLAYWRIGHT_SUMMARY:
			"1/1 browser tests passed; 1 viewport measurements; maximum horizontal overflow 0 px.",
	};
}

test("rejects a malformed current head SHA before requesting GitHub", async () => {
	// Given valid comment inputs except for a short head SHA.
	validInputs();
	process.env["PR_HEAD_SHA"] = "abc";
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		return new Response("[]");
	};

	// When the comment entrypoint runs.
	const result = main();

	// Then it rejects the SHA without making a GitHub request.
	await assert.rejects(result, /Missing or invalid preview comment input/);
	assert.equal(calls, 0);
});

test.each([undefined, "unknown"])(
	"rejects capture status %s before requesting GitHub",
	async (status) => {
		// Given valid comment inputs except for a missing or unknown capture status.
		validInputs();
		if (status === undefined) {
			delete process.env["PREVIEW_CAPTURE_STATUS"];
		} else {
			process.env["PREVIEW_CAPTURE_STATUS"] = status;
		}
		let calls = 0;
		globalThis.fetch = async () => {
			calls++;
			return new Response("[]");
		};

		// When the comment entrypoint runs.
		const result = main();

		// Then it rejects the status without making a GitHub request.
		await assert.rejects(result, /Missing or invalid preview capture status/);
		assert.equal(calls, 0);
	},
);
