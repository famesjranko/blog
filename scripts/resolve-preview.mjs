import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const checkName = "Cloudflare Pages";
const waitMs = 20 * 60 * 1000;

export function previewFromChecks(checks, sha) {
	const matching = checks.filter(
		(check) => check.name === checkName && check.head_sha === sha,
	);
	const successful = matching.find(
		(check) => check.status === "completed" && check.conclusion === "success",
	);
	if (successful) {
		return parsePreview(successful.output?.summary, sha);
	}
	const failed = matching.find((check) => check.status === "completed");
	if (failed) {
		throw new Error(`Cloudflare Pages check concluded ${failed.conclusion}`);
	}
	return undefined;
}

export function parsePreview(summary, sha) {
	if (typeof summary !== "string") {
		throw new Error("Cloudflare Pages check has no summary");
	}
	const commit = summary.match(
		/<strong>Latest commit:<\/strong>\s*<\/td>\s*<td>\s*<code>([a-f0-9]{7,40})<\/code>/,
	)?.[1];
	if (!commit || !sha.startsWith(commit)) {
		throw new Error("Cloudflare Pages summary commit does not match PR head");
	}
	const href = summary.match(
		/<strong>Preview URL:<\/strong>\s*<\/td>\s*<td>\s*<a href=['"]([^'"]+)['"]/,
	)?.[1];
	if (!href) {
		throw new Error("Cloudflare Pages summary has no immutable Preview URL");
	}
	const url = new URL(href);
	if (
		url.protocol !== "https:" ||
		!/^[a-f0-9]{8}\.[a-z0-9-]+\.pages\.dev$/.test(url.hostname) ||
		url.pathname !== "/" ||
		url.search ||
		url.hash
	) {
		throw new Error(
			"Cloudflare Pages Preview URL is not an immutable hash URL",
		);
	}
	return url.origin;
}

async function waitForPreview(repository, sha, token) {
	const deadline = Date.now() + waitMs;
	const endpoint = `https://api.github.com/repos/${repository}/commits/${sha}/check-runs?check_name=${encodeURIComponent(checkName)}&per_page=100`;
	while (Date.now() < deadline) {
		const response = await fetch(endpoint, {
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${token}`,
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});
		if (!response.ok) {
			throw new Error(`GitHub check-runs API returned ${response.status}`);
		}
		const body = await response.json();
		const url = previewFromChecks(body.check_runs, sha);
		if (url) {
			return url;
		}
		await new Promise((resolve) => setTimeout(resolve, 15_000));
	}
	throw new Error("Timed out waiting for the PR head Cloudflare Pages check");
}

async function main() {
	const {
		GH_REPOSITORY: repository,
		GH_TOKEN: token,
		PR_HEAD_SHA: sha,
		GITHUB_OUTPUT: output,
	} = process.env;
	if (
		!repository ||
		!token ||
		!sha ||
		!output ||
		!/^[a-f0-9]{40}$/.test(sha) ||
		!/^[\w.-]+\/[\w.-]+$/.test(repository)
	) {
		throw new Error("Missing or invalid GitHub preview lookup input");
	}
	const url = await waitForPreview(repository, sha, token);
	await appendFile(output, `url=${url}\n`);
	process.stdout.write(`Cloudflare preview for ${sha}: ${url}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
}
