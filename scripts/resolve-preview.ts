import { appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const checkName = "Cloudflare Pages";
const pollMs = 15_000;
const deadlineMs = 20 * 60 * 1000;
// Cloudflare registers its check run when it queues the build, normally
// within a minute of the push. Fork PRs get no preview and skipped builds
// may get no check run, so a check still absent after this window is
// treated as "no preview" instead of polling until the deadline.
const graceMs = 3 * 60 * 1000;

const checkRunsSchema = z.object({
	check_runs: z.array(
		z.object({
			id: z.number().int(),
			name: z.string(),
			head_sha: z.string(),
			status: z.string(),
			conclusion: z.string().nullable(),
			output: z.object({ summary: z.string().nullable() }),
		}),
	),
});

export type CheckRun = z.infer<typeof checkRunsSchema>["check_runs"][number];

export type Decision =
	| { kind: "found"; url: string }
	| { kind: "wait" }
	| { kind: "no-preview" }
	| { kind: "failed"; conclusion: string | null }
	| { kind: "timeout" };

type Outcome = Exclude<Decision, { kind: "wait" }>;

export interface Poll {
	checks: readonly CheckRun[];
	sha: string;
	elapsedMs: number;
}

export function decide({ checks, sha, elapsedMs }: Poll): Decision {
	// A re-run supersedes earlier runs, so only the newest one counts. Check
	// run ids are assigned in creation order, are always present, and never
	// tie, unlike started_at.
	const newest = checks
		.filter((check) => check.name === checkName && check.head_sha === sha)
		.reduce<CheckRun | undefined>(
			(latest, check) => (latest && latest.id > check.id ? latest : check),
			undefined,
		);
	if (newest?.status === "completed") {
		return completed(newest, sha);
	}
	if (!newest && elapsedMs >= graceMs) {
		return { kind: "no-preview" };
	}
	return elapsedMs >= deadlineMs ? { kind: "timeout" } : { kind: "wait" };
}

function completed(check: CheckRun, sha: string): Outcome {
	if (check.conclusion === "success") {
		return { kind: "found", url: parsePreview(check.output.summary, sha) };
	}
	// [CF-Pages-Skip] and similar skips publish no preview by design.
	if (check.conclusion === "skipped") {
		return { kind: "no-preview" };
	}
	return { kind: "failed", conclusion: check.conclusion };
}

export function parsePreview(summary: string | null, sha: string): string {
	if (summary === null) {
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

interface Lookup {
	repository: string;
	sha: string;
	token: string;
	output: string;
}

async function fetchChecks({
	repository,
	sha,
	token,
}: Lookup): Promise<CheckRun[]> {
	const endpoint = `https://api.github.com/repos/${repository}/commits/${sha}/check-runs?check_name=${encodeURIComponent(checkName)}&per_page=100`;
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
	return checkRunsSchema.parse(await response.json()).check_runs;
}

// Thin I/O around decide(): every wait, grace, and deadline choice is there.
async function poll(lookup: Lookup): Promise<Outcome> {
	const start = Date.now();
	for (;;) {
		const checks = await fetchChecks(lookup);
		const decision = decide({
			checks,
			sha: lookup.sha,
			elapsedMs: Date.now() - start,
		});
		if (decision.kind !== "wait") {
			return decision;
		}
		await new Promise((resolve) => setTimeout(resolve, pollMs));
	}
}

function readLookup(): Lookup {
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
	return { repository, sha, token, output };
}

async function main(): Promise<void> {
	const lookup = readLookup();
	const decision = await poll(lookup);
	switch (decision.kind) {
		case "found":
			await appendFile(lookup.output, `url=${decision.url}\n`);
			process.stdout.write(
				`Cloudflare preview for ${lookup.sha}: ${decision.url}\n`,
			);
			return;
		case "no-preview":
			// An explicit marker, not a missing url, skips capture; a resolver
			// that silently writes nothing then fails capture loudly instead.
			await appendFile(lookup.output, "preview=none\n");
			process.stdout.write(
				`::notice::No Cloudflare Pages preview for ${lookup.sha}; likely a fork PR or a skipped build. Preview capture skipped.\n`,
			);
			return;
		case "failed":
			throw new Error(
				`Cloudflare Pages check concluded ${decision.conclusion}`,
			);
		case "timeout":
			throw new Error(
				"Timed out waiting for the PR head Cloudflare Pages check",
			);
	}
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error: unknown) => {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`,
		);
		process.exitCode = 1;
	});
}
