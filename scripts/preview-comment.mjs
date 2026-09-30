import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const marker = "<!-- blog-preview-capture -->";

function allSpecs(suites) {
	return suites.flatMap((suite) => [
		...(suite.specs ?? []),
		...allSpecs(suite.suites ?? []),
	]);
}

async function readOverflow(attachment, directory) {
	const path = resolve(attachment.path);
	if (!path.startsWith(`${directory}${sep}`)) {
		throw new Error("Geometry attachment is outside the capture directory");
	}
	const { viewport, content } = JSON.parse(await readFile(path, "utf8"));
	if (!Number.isFinite(viewport) || !Number.isFinite(content)) {
		throw new Error("Geometry attachment has invalid dimensions");
	}
	return Math.max(0, content - viewport);
}

export async function summarizeResults(report, resultsFile) {
	const tests = allSpecs(report.suites ?? []).flatMap(
		(spec) => spec.tests ?? [],
	);
	if (tests.length === 0) {
		throw new Error("Playwright report contains no tests");
	}
	const passed = tests.filter(
		(test) => test.results?.at(-1)?.status === "passed",
	).length;
	const directory = resolve(resultsFile, "..");
	const attachments = tests
		.flatMap((test) => test.results ?? [])
		.flatMap((result) => result.attachments ?? [])
		.filter(
			(attachment) =>
				attachment.name === "geometry-overflow" && attachment.path,
		);
	const overflows = await Promise.all(
		attachments.map((attachment) => readOverflow(attachment, directory)),
	);
	if (overflows.length === 0) {
		throw new Error("Playwright report contains no viewport measurements");
	}
	return `${passed}/${tests.length} browser tests passed; ${overflows.length} viewport measurements; maximum horizontal overflow ${Math.max(...overflows)} px.`;
}

export function commentBody({ url, sha, artifactUrl, summary }) {
	return `${marker}\nPreview capture for commit \`${sha}\`\n\n- Immutable preview: ${url}\n- Capture artifact: ${artifactUrl}\n- Measurements: ${summary}`;
}

async function githubRequest(url, token, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			Accept: "application/vnd.github+json",
			Authorization: `Bearer ${token}`,
			"X-GitHub-Api-Version": "2022-11-28",
			...(options.body ? { "Content-Type": "application/json" } : {}),
		},
	});
	if (!response.ok) {
		throw new Error(
			`GitHub comments API returned ${response.status} for ${options.method ?? "GET"} ${url}`,
		);
	}
	return response;
}

export async function upsertComment({ repository, number, token, body }) {
	const base = `https://api.github.com/repos/${repository}/issues/${number}/comments`;
	let existing;
	for (let page = 1; ; page++) {
		const response = await githubRequest(
			`${base}?per_page=100&page=${page}`,
			token,
		);
		const comments = await response.json();
		if (!Array.isArray(comments)) {
			throw new Error("GitHub comments API returned invalid data");
		}
		existing = comments.find(
			(comment) =>
				comment.user?.type === "Bot" && comment.body?.includes(marker),
		);
		if (existing || comments.length < 100) {
			break;
		}
	}
	const url = existing
		? `https://api.github.com/repos/${repository}/issues/comments/${existing.id}`
		: base;
	const method = existing ? "PATCH" : "POST";
	await githubRequest(url, token, { method, body: JSON.stringify({ body }) });
	process.stdout.write(
		`${method === "PATCH" ? "Updated" : "Created"} preview comment\n`,
	);
}

async function main() {
	const {
		GH_TOKEN: token,
		GH_REPOSITORY: repository,
		PR_NUMBER: number,
		PR_HEAD_SHA: sha,
		PREVIEW_URL: url,
		ARTIFACT_URL: artifactUrl,
		PLAYWRIGHT_RESULTS_FILE: resultsFile,
	} = process.env;
	if (
		!token ||
		!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") ||
		!/^[1-9]\d*$/.test(number ?? "") ||
		!/^[a-f0-9]{40}$/.test(sha ?? "") ||
		!url ||
		!artifactUrl ||
		!resultsFile
	) {
		throw new Error("Missing or invalid preview comment input");
	}
	const report = JSON.parse(await readFile(resultsFile, "utf8"));
	const summary = await summarizeResults(report, resultsFile);
	await upsertComment({
		repository,
		number,
		token,
		body: commentBody({ url, sha, artifactUrl, summary }),
	});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
}
