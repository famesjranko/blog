import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "vitest";
import { fileURLToPath } from "node:url";
import {
	commentBody,
	main,
	marker,
	summarizeResults,
	upsertComment,
} from "./preview-comment.ts";

function reportWith(
	...results: {
		status: string;
		attachments?: { name: string; path: string }[];
	}[]
) {
	return {
		suites: [
			{ specs: [{ tests: results.map((result) => ({ results: [result] })) }] },
		],
	};
}

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
afterEach(() => {
	globalThis.fetch = originalFetch;
	process.env = { ...originalEnv };
});

test("writes a capture summary as a job output without a comment token", async () => {
	// Given a Playwright report and an attachment in the capture directory.
	const directory = await mkdtemp(join(tmpdir(), "preview-summary-"));
	const attachment = join(directory, "geometry.json");
	const resultsFile = join(directory, "results.json");
	await writeFile(attachment, JSON.stringify({ viewport: 400, content: 403 }));
	await writeFile(
		resultsFile,
		JSON.stringify(
			reportWith({
				status: "passed",
				attachments: [{ name: "geometry-overflow", path: attachment }],
			}),
		),
	);

	// When the capture job requests its summary output.
	const output = execFileSync(
		process.execPath,
		[
			fileURLToPath(
				new URL("../node_modules/tsx/dist/cli.mjs", import.meta.url),
			),
			fileURLToPath(new URL("./preview-comment.ts", import.meta.url)),
			"--summary",
		],
		{ encoding: "utf8", env: { PLAYWRIGHT_RESULTS_FILE: resultsFile } },
	);

	// Then it writes the measured result in GitHub job output format.
	assert.equal(
		output,
		"summary=1/1 browser tests passed; 1 viewport measurements; maximum horizontal overflow 3 px.\n",
	);
});

test("summarizes measured overflow from Playwright attachments", async () => {
	// Given a Playwright report with two browser results and real measurement attachments.
	const directory = await mkdtemp(join(tmpdir(), "preview-comment-"));
	const first = join(directory, "first.json");
	const second = join(directory, "second.json");
	await writeFile(first, JSON.stringify({ viewport: 390, content: 391 }));
	await writeFile(second, JSON.stringify({ viewport: 1280, content: 1270 }));
	const report = {
		suites: [
			{
				specs: [
					{
						tests: [
							{
								results: [
									{
										status: "passed",
										attachments: [{ name: "geometry-overflow", path: first }],
									},
								],
							},
							{
								results: [
									{
										status: "failed",
										attachments: [{ name: "geometry-overflow", path: second }],
									},
								],
							},
						],
					},
				],
			},
		],
	};

	// When the report is summarized.
	const summary = await summarizeResults(
		report,
		join(directory, "results.json"),
	);

	// Then the summary reflects the actual test results and dimensions.
	assert.equal(
		summary,
		"1/2 browser tests passed; 2 viewport measurements; maximum horizontal overflow 1 px.",
	);
});

test("creates one text-only comment when no marked bot comment exists", async () => {
	// Given an issue with no marked bot comment.
	const calls: { url: string; options: RequestInit }[] = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url: String(url), options: options ?? {} });
		return new Response(options?.method === "POST" ? "{}" : "[]", {
			status: options?.method === "POST" ? 201 : 200,
		});
	};
	const body = commentBody({
		status: "passed",
		url: "https://abc12345.site.pages.dev",
		sha: "a".repeat(40),
		artifactUrl: "https://github.com/o/r/actions/runs/1/artifacts/2",
		summary: "1 viewport measurement.",
	});

	// When the capture publishes its result.
	await upsertComment({ repository: "o/r", number: "7", token: "token", body });

	// Then it creates one comment with links and no embedded images.
	assert.equal(calls.length, 2);
	assert.ok(calls[1]);
	assert.equal(calls[1].options.method, "POST");
	assert.equal(JSON.parse(String(calls[1].options.body)).body, body);
	assert.match(body, /abc12345\.site\.pages\.dev/);
	assert.match(body, /a{40}/);
	assert.match(body, /artifacts\/2/);
	assert.doesNotMatch(body, /!\[|<img\b/i);
});

test("updates the marked bot comment found on a later page", async () => {
	// Given a full first page and a marked bot comment on the second page.
	const calls: { url: string; options: RequestInit }[] = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url: String(url), options: options ?? {} });
		if (options?.method === "PATCH") {
			return new Response("{}", { status: 200 });
		}
		if (String(url).endsWith("&page=1")) {
			return new Response(
				JSON.stringify(
					Array.from({ length: 100 }, () => ({
						user: { type: "User" },
						body: marker,
					})),
				),
				{ status: 200 },
			);
		}
		return new Response(
			JSON.stringify([
				{
					id: 42,
					user: { type: "Bot", login: "github-actions[bot]" },
					body: marker,
				},
			]),
			{ status: 200 },
		);
	};

	// When a later head publishes its result.
	await upsertComment({
		repository: "o/r",
		number: "7",
		token: "token",
		body: "new result",
	});

	// Then the existing comment receives the new body without creating another.
	assert.equal(calls.length, 3);
	assert.ok(calls[2]);
	assert.equal(calls[2].options.method, "PATCH");
	assert.equal(
		calls[2].url,
		"https://api.github.com/repos/o/r/issues/comments/42",
	);
	assert.deepEqual(JSON.parse(String(calls[2].options.body)), {
		body: "new result",
	});
});

test("ignores another bot quoting the marker before the owned comment", async () => {
	// Given another bot quotes the marker before the GitHub Actions comment.
	const calls: { url: string; options: RequestInit }[] = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url: String(url), options: options ?? {} });
		return new Response(
			options?.method === "PATCH"
				? "{}"
				: JSON.stringify([
						{
							id: 1,
							user: { type: "Bot", login: "review-bot[bot]" },
							body: `Quote: ${marker}`,
						},
						{
							id: 2,
							user: { type: "Bot", login: "github-actions[bot]" },
							body: marker,
						},
					]),
		);
	};

	// When the capture publishes its result.
	await upsertComment({
		repository: "o/r",
		number: "7",
		token: "token",
		body: "new result",
	});

	// Then it updates only the GitHub Actions comment.
	assert.ok(calls[1]);
	assert.equal(calls[1].options.method, "PATCH");
	assert.equal(
		calls[1].url,
		"https://api.github.com/repos/o/r/issues/comments/2",
	);
});

test("reports bounded GitHub 403 diagnostics without exposing the token or response body", async () => {
	// Given a rejected comment request with GitHub diagnostics and sensitive response data.
	const token = "secret-preview-token";
	globalThis.fetch = async (_url, options) => {
		if (options?.method !== "POST") {
			return new Response("[]");
		}
		return new Response(
			JSON.stringify({
				message: `Resource not accessible by integration ${token} ${"x".repeat(500)}`,
				secret: "unrelated-private-response-data",
			}),
			{
				status: 403,
				headers: {
					"X-Accepted-GitHub-Permissions": "pull_requests=write",
					"X-GitHub-Request-Id": "ABCD:1234",
				},
			},
		);
	};

	// When the capture attempts to create a pull request comment.
	await assert.rejects(
		upsertComment({ repository: "o/r", number: "7", token, body: "result" }),
		(error) => {
			assert.ok(error instanceof Error);
			// Then the error identifies the rejected request and selected safe diagnostics.
			assert.match(
				error.message,
				/403 for POST https:\/\/api\.github\.com\/repos\/o\/r\/issues\/7\/comments/,
			);
			assert.match(error.message, /Resource not accessible by integration/);
			assert.match(error.message, /pull_requests=write/);
			assert.match(error.message, /ABCD:1234/);
			assert.doesNotMatch(
				error.message,
				/secret-preview-token|unrelated-private-response-data/,
			);
			assert.ok(error.message.length < 600);
			return true;
		},
	);
});
test("rejects a geometry attachment outside the report directory", async () => {
	// Given a report points to a geometry file outside its capture directory.
	const directory = await mkdtemp(join(tmpdir(), "preview-safe-"));
	const outside = join(tmpdir(), "outside-geometry.json");
	const report = reportWith({
		status: "passed",
		attachments: [{ name: "geometry-overflow", path: outside }],
	});

	// When the report is summarized.
	const result = summarizeResults(report, join(directory, "results.json"));

	// Then it rejects the unsafe path before reading it.
	await assert.rejects(result, /outside the capture directory/);
});
test("rejects non-finite geometry dimensions", async () => {
	// Given a geometry attachment has a non-finite content width.
	const directory = await mkdtemp(join(tmpdir(), "preview-finite-"));
	const attachment = join(directory, "geometry.json");
	await writeFile(
		attachment,
		JSON.stringify({ viewport: 400, content: "Infinity" }),
	);
	const report = reportWith({
		status: "passed",
		attachments: [{ name: "geometry-overflow", path: attachment }],
	});

	// When the report is summarized.
	const result = summarizeResults(report, join(directory, "results.json"));

	// Then it rejects the invalid dimensions.
	await assert.rejects(result, /invalid dimensions/);
});
test("rejects a report with no tests", async () => {
	// Given a Playwright report has no tests.
	const report = { suites: [] };

	// When the report is summarized.
	const result = summarizeResults(report, "/tmp/results.json");

	// Then it reports the missing tests.
	await assert.rejects(result, /contains no tests/);
});
test("rejects a report with no viewport measurements", async () => {
	// Given a Playwright report has a test without geometry attachments.
	const report = {
		suites: [{ specs: [{ tests: [{ results: [{ status: "passed" }] }] }] }],
	};

	// When the report is summarized.
	const result = summarizeResults(report, "/tmp/results.json");

	// Then it reports the missing measurements.
	await assert.rejects(result, /contains no viewport measurements/);
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

test("includes available measurements for a failed capture", () => {
	// Given a failed current head has a valid partial report summary.
	const summary =
		"2/3 browser tests passed; 3 viewport measurements; maximum horizontal overflow 4 px.";

	// When the comment is composed.
	const body = commentBody({ sha: "c".repeat(40), status: "failed", summary });

	// Then the failed outcome includes the available measurements.
	assert.match(body, /- Outcome: failed/);
	assert.match(body, /2\/3 browser tests passed/);
});
