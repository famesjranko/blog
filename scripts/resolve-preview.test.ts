import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { type CheckRun, decide, parsePreview } from "./resolve-preview.js";

const sha = "b0a91e364b529ce41ec93cf5bd98f17b15ff1d2f";
const hashUrl = "https://ee0ec759.andrewjmcdonald-com.pages.dev";
const branchUrl =
	"https://feat-issue-28-snapshots.andrewjmcdonald-com.pages.dev";
const summary = `<table><tr><td><strong>Latest commit:</strong> </td><td><code>b0a91e3</code></td></tr><tr><td><strong>Preview URL:</strong></td><td><a href='${hashUrl}'>${hashUrl}</a></td></tr><tr><td><strong>Branch Preview URL:</strong></td><td><a href='${branchUrl}'>${branchUrl}</a></td></tr></table>`;
// Restated from the resolver so a changed window or deadline fails here.
const minute = 60 * 1000;
const graceMs = 3 * minute;
const deadlineMs = 20 * minute;

function check(fields: Partial<CheckRun>): CheckRun {
	return {
		id: 1,
		name: "Cloudflare Pages",
		head_sha: sha,
		status: "completed",
		conclusion: "success",
		output: { summary },
		...fields,
	};
}

const pending = check({
	status: "in_progress",
	conclusion: null,
	output: { summary: null },
});

describe("decide on a completed check", () => {
	it("selects the immutable preview for the exact PR head", () => {
		// Given a successful head check and a newer one for another commit.
		const other = summary
			.replace("b0a91e3", "aaaaaaa")
			.replaceAll(hashUrl, "https://aa11bb22.andrewjmcdonald-com.pages.dev");
		const checks = [
			check({ id: 1 }),
			check({ id: 2, head_sha: "a".repeat(40), output: { summary: other } }),
		];

		// When the preview is decided for the requested head.
		const result = decide({ checks, sha, elapsedMs: 0 });

		// Then only the head's immutable hash URL is returned.
		expect(result).toEqual({ kind: "found", url: hashUrl });
	});

	it("reports a failed Cloudflare check without waiting", () => {
		// Given a failed Cloudflare check on the requested head.
		const checks = [check({ conclusion: "failure" })];

		// When the preview is decided for the requested head.
		const result = decide({ checks, sha, elapsedMs: 0 });

		// Then the failure and its conclusion are reported.
		expect(result).toEqual({ kind: "failed", conclusion: "failure" });
	});

	it("ends with no preview when the Cloudflare build was skipped", () => {
		// Given a Cloudflare check on the head that concluded as skipped.
		const checks = [
			check({ conclusion: "skipped", output: { summary: null } }),
		];

		// When the preview is decided before the grace window ends.
		const result = decide({ checks, sha, elapsedMs: 0 });

		// Then the resolver reports that no preview exists.
		expect(result).toEqual({ kind: "no-preview" });
	});
});

describe("decide on a pending check", () => {
	it("waits while the Cloudflare check is still in progress", () => {
		// Given an in-progress Cloudflare check well past the grace window.
		const checks = [pending];

		// When the preview is decided before the deadline.
		const result = decide({ checks, sha, elapsedMs: deadlineMs - 1 });

		// Then the resolver keeps waiting.
		expect(result).toEqual({ kind: "wait" });
	});

	it("times out when the Cloudflare check is still pending at the deadline", () => {
		// Given an in-progress Cloudflare check.
		const checks = [pending];

		// When the preview is decided at the deadline.
		const result = decide({ checks, sha, elapsedMs: deadlineMs });

		// Then the resolver stops with a timeout.
		expect(result).toEqual({ kind: "timeout" });
	});

	it("waits for a re-run that supersedes an older failed run", () => {
		// Given an older failed run and a newer in-progress re-run for the head.
		const checks = [
			check({ id: 1, conclusion: "failure" }),
			{ ...pending, id: 2 },
		];

		// When the preview is decided before the deadline.
		const result = decide({ checks, sha, elapsedMs: 0 });

		// Then the resolver waits for the re-run.
		expect(result).toEqual({ kind: "wait" });
	});
});

describe("decide on a missing check", () => {
	it("waits for a missing check inside the grace window", () => {
		// Given no Cloudflare check for the head, only one for another commit.
		const checks = [check({ head_sha: "a".repeat(40) })];

		// When the preview is decided just before the grace window ends.
		const result = decide({ checks, sha, elapsedMs: graceMs - 1 });

		// Then the resolver keeps waiting for the check to appear.
		expect(result).toEqual({ kind: "wait" });
	});

	it("ends with no preview when the check is still missing after the grace window", () => {
		// Given no Cloudflare check for the head.
		const checks: CheckRun[] = [];

		// When the preview is decided as the grace window ends.
		const result = decide({ checks, sha, elapsedMs: graceMs });

		// Then the resolver reports that no preview exists.
		expect(result).toEqual({ kind: "no-preview" });
	});
});

describe("parsePreview", () => {
	it("rejects a successful check whose summary names a different commit", () => {
		// Given a summary for the requested head that names a stale commit.
		const stale = summary.replace("b0a91e3", "aaaaaaaa");

		// When the summary is parsed for the requested head.
		const parse = () => parsePreview(stale, sha);

		// Then the stale deployment is rejected.
		expect(parse).toThrow(/summary commit does not match/);
	});

	it("rejects a mutable branch alias in the Preview URL field", () => {
		// Given a summary that places the branch alias in the Preview URL field.
		const alias = summary.replaceAll(hashUrl, branchUrl);

		// When the summary is parsed for the requested head.
		const parse = () => parsePreview(alias, sha);

		// Then the alias is rejected.
		expect(parse).toThrow(/not an immutable hash URL/);
	});

	it("rejects a plain http Preview URL", () => {
		// Given a summary whose hash Preview URL uses http.
		const plain = summary.replaceAll(
			hashUrl,
			hashUrl.replace("https:", "http:"),
		);

		// When the summary is parsed for the requested head.
		const parse = () => parsePreview(plain, sha);

		// Then the insecure URL is rejected.
		expect(parse).toThrow(/not an immutable hash URL/);
	});
});

describe("check-runs response parsing", () => {
	it("does not disclose malformed response bodies or the API token", () => {
		// Given a successful API response containing the same value as the token.
		const sourcePath = resolve("scripts/resolve-preview.ts");
		const script = [
			'globalThis.fetch = async () => new Response("tok7", { status: 200 });',
			`process.argv[1] = ${JSON.stringify(sourcePath)};`,
			'await import("./scripts/resolve-preview.ts");',
		].join(" ");
		const result = spawnSync(
			process.execPath,
			["--import", "tsx", "--eval", script],
			{
				encoding: "utf8",
				env: {
					...process.env,
					GH_REPOSITORY: "andy/blog",
					GH_TOKEN: "tok7",
					PR_HEAD_SHA: sha,
					GITHUB_OUTPUT: "/tmp/resolve-preview-test-output",
				},
			},
		);

		// When the resolver handles the mocked response.

		// Then it reports a fixed diagnostic without response content or token.
		expect(result.status).toBe(1);
		expect(result.stderr).toBe("GitHub check-runs API returned invalid JSON\n");
		expect(result.stderr).not.toContain("tok7");
	});
});
