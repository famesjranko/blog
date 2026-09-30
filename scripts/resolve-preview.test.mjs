import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePreview, previewFromChecks } from "./resolve-preview.mjs";

const sha = "b0a91e364b529ce41ec93cf5bd98f17b15ff1d2f";
const hashUrl = "https://ee0ec759.andrewjmcdonald-com.pages.dev";
const branchUrl =
	"https://feat-issue-28-snapshots.andrewjmcdonald-com.pages.dev";
const summary = `<table><tr><td><strong>Latest commit:</strong> </td><td><code>b0a91e3</code></td></tr><tr><td><strong>Preview URL:</strong></td><td><a href='${hashUrl}'>${hashUrl}</a></td></tr><tr><td><strong>Branch Preview URL:</strong></td><td><a href='${branchUrl}'>${branchUrl}</a></td></tr></table>`;

test("selects the immutable preview for the exact PR head", () => {
	// Given successful checks for an older commit and the requested head.
	const checks = [
		{
			name: "Cloudflare Pages",
			head_sha: "a".repeat(40),
			status: "completed",
			conclusion: "success",
			output: {
				summary: summary.replaceAll(
					hashUrl,
					"https://aa11bb22.andrewjmcdonald-com.pages.dev",
				),
			},
		},
		{
			name: "Cloudflare Pages",
			head_sha: sha,
			status: "completed",
			conclusion: "success",
			output: { summary },
		},
	];

	// When the preview is selected for the requested head.
	const result = previewFromChecks(checks, sha);

	// Then only the immutable hash URL is returned.
	assert.equal(result, hashUrl);
});

test("rejects a successful check whose summary names a different commit", () => {
	// Given a check on the requested head with a stale summary.
	const stale = summary.replace("b0a91e3", "aaaaaaaa");

	// When the summary is parsed for the requested head.
	const parse = () => parsePreview(stale, sha);

	// Then the stale deployment is rejected.
	assert.throws(parse, /summary commit does not match/);
});

test("rejects a mutable branch alias in the Preview URL field", () => {
	// Given a summary that places the branch alias in the Preview URL field.
	const alias = summary.replaceAll(hashUrl, branchUrl);

	// When the summary is parsed for the requested head.
	const parse = () => parsePreview(alias, sha);

	// Then the alias is rejected.
	assert.throws(parse, /not an immutable hash URL/);
});

test("fails immediately when the Cloudflare check fails", () => {
	// Given a failed Cloudflare check on the requested head.
	const checks = [
		{
			name: "Cloudflare Pages",
			head_sha: sha,
			status: "completed",
			conclusion: "failure",
		},
	];

	// When the preview is selected for the requested head.
	const select = () => previewFromChecks(checks, sha);

	// Then the failure is reported without waiting for another check.
	assert.throws(select, /concluded failure/);
});
