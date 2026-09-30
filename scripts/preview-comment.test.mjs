import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	commentBody,
	marker,
	summarizeResults,
	upsertComment,
} from "./preview-comment.mjs";

const originalFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = originalFetch;
});

test("writes a capture summary as a job output without a comment token", async () => {
	// Given a Playwright report and an attachment in the capture directory.
	const directory = await mkdtemp(join(tmpdir(), "preview-summary-"));
	const attachment = join(directory, "geometry.json");
	const resultsFile = join(directory, "results.json");
	await writeFile(attachment, JSON.stringify({ viewport: 400, content: 403 }));
	await writeFile(
		resultsFile,
		JSON.stringify({
			suites: [
				{
					specs: [
						{
							tests: [
								{
									results: [
										{
											status: "passed",
											attachments: [
												{ name: "geometry-overflow", path: attachment },
											],
										},
									],
								},
							],
						},
					],
				},
			],
		}),
	);

	// When the capture job requests its summary output.
	const output = execFileSync(
		process.execPath,
		[
			fileURLToPath(new URL("./preview-comment.mjs", import.meta.url)),
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
	const calls = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url, options });
		return new Response(options?.method === "POST" ? "{}" : "[]", {
			status: options?.method === "POST" ? 201 : 200,
		});
	};
	const body = commentBody({
		url: "https://abc12345.site.pages.dev",
		sha: "a".repeat(40),
		artifactUrl: "https://github.com/o/r/actions/runs/1/artifacts/2",
		summary: "1 viewport measurement.",
	});

	// When the capture publishes its result.
	await upsertComment({ repository: "o/r", number: "7", token: "token", body });

	// Then it creates one comment with links and no embedded images.
	assert.equal(calls.length, 2);
	assert.equal(calls[1].options.method, "POST");
	assert.equal(JSON.parse(calls[1].options.body).body, body);
	assert.match(body, /abc12345\.site\.pages\.dev/);
	assert.match(body, /a{40}/);
	assert.match(body, /artifacts\/2/);
	assert.doesNotMatch(body, /!\[|<img\b/i);
});

test("updates the marked bot comment found on a later page", async () => {
	// Given a full first page and a marked bot comment on the second page.
	const calls = [];
	globalThis.fetch = async (url, options) => {
		calls.push({ url, options });
		if (options?.method === "PATCH") {
			return new Response("{}", { status: 200 });
		}
		if (url.endsWith("&page=1")) {
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
			JSON.stringify([{ id: 42, user: { type: "Bot" }, body: marker }]),
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
	assert.equal(calls[2].options.method, "PATCH");
	assert.equal(
		calls[2].url,
		"https://api.github.com/repos/o/r/issues/comments/42",
	);
	assert.deepEqual(JSON.parse(calls[2].options.body), { body: "new result" });
});
