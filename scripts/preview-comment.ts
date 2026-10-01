import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
export const marker = "<!-- blog-preview-capture -->";
type Attachment = { name: string; path?: string };
type Result = { status?: string; attachments?: Attachment[] };
type BrowserTest = { results?: Result[] };
type Suite = { specs?: { tests?: BrowserTest[] }[]; suites?: Suite[] };
type Report = { suites?: Suite[] };
type Status = "passed" | "failed" | "skipped";
interface CommentInput {
	sha: string;
	status: Status;
	url?: string;
	artifactUrl?: string;
	summary?: string;
}
interface CommentRequest {
	repository: string;
	number: string;
	token: string;
	body: string;
}
function captureStatus(value: string | undefined): Status {
	if (value === "passed" || value === "failed" || value === "skipped") {
		return value;
	}
	throw new Error("Missing or invalid preview capture status");
}
function allSpecs(suites: Suite[]): { tests?: BrowserTest[] }[] {
	return suites.flatMap((suite) => [
		...(suite.specs ?? []),
		...allSpecs(suite.suites ?? []),
	]);
}
async function readOverflow(
	attachment: Attachment,
	directory: string,
): Promise<number> {
	if (!attachment.path) {
		throw new Error("Geometry attachment has no path");
	}
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
export async function summarizeResults(
	report: Report,
	resultsFile: string,
): Promise<string> {
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

export function commentBody({
	url,
	sha,
	artifactUrl,
	summary,
	status,
}: CommentInput): string {
	return [
		`${marker}\nPreview capture for commit \`${sha}\`\n`,
		`- Outcome: ${status}`,
		...(url ? [`- Immutable preview: ${url}`] : []),
		...(artifactUrl ? [`- Capture artifact: ${artifactUrl}`] : []),
		...(summary ? [`- Measurements: ${summary}`] : []),
	].join("\n");
}
function safeDiagnostic(value: unknown, token: string, limit: number): string {
	if (typeof value !== "string") {
		return "";
	}
	const redacted = token ? value.replaceAll(token, "[REDACTED]") : value;
	return redacted.replace(/[\r\n\t]/g, " ").slice(0, limit);
}

async function githubRequest(
	url: string,
	token: string,
	options: RequestInit = {},
): Promise<Response> {
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
		const data = (await response.json().catch(() => null)) as {
			message?: unknown;
		} | null;
		const message = safeDiagnostic(data?.message, token, 200);
		const permissions = safeDiagnostic(
			response.headers.get("X-Accepted-GitHub-Permissions"),
			token,
			150,
		);
		const requestId = safeDiagnostic(
			response.headers.get("X-GitHub-Request-Id"),
			token,
			80,
		);
		const details = [
			message && `message: ${message}`,
			permissions && `accepted permissions: ${permissions}`,
			requestId && `request ID: ${requestId}`,
		].filter(Boolean);
		throw new Error(
			`GitHub comments API returned ${response.status} for ${safeDiagnostic(options.method ?? "GET", token, 10)} ${safeDiagnostic(url, token, 300)}${details.length ? `; ${details.join("; ")}` : ""}`,
		);
	}
	return response;
}

export async function upsertComment({
	repository,
	number,
	token,
	body,
}: CommentRequest): Promise<void> {
	const base = `https://api.github.com/repos/${repository}/issues/${number}/comments`;
	let existing: { id: number } | undefined;
	for (let page = 1; ; page++) {
		const response = await githubRequest(
			`${base}?per_page=100&page=${page}`,
			token,
		);
		const comments: unknown = await response.json();
		if (!Array.isArray(comments)) {
			throw new Error("GitHub comments API returned invalid data");
		}
		existing = comments.find(
			(comment): comment is { id: number } =>
				comment !== null &&
				typeof comment === "object" &&
				"user" in comment &&
				comment.user !== null &&
				typeof comment.user === "object" &&
				"login" in comment.user &&
				comment.user.login === "github-actions[bot]" &&
				"body" in comment &&
				typeof comment.body === "string" &&
				comment.body.includes(marker) &&
				"id" in comment &&
				typeof comment.id === "number",
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

async function printSummary(): Promise<void> {
	const { PLAYWRIGHT_RESULTS_FILE: resultsFile } = process.env;
	if (!resultsFile) {
		throw new Error("Missing Playwright results file");
	}
	const report = JSON.parse(await readFile(resultsFile, "utf8"));
	process.stdout.write(
		`summary=${await summarizeResults(report, resultsFile)}\n`,
	);
}

export async function main(): Promise<void> {
	if (process.argv[2] === "--summary") {
		return printSummary();
	}
	const {
		GH_TOKEN: token,
		GH_REPOSITORY: repository,
		PR_NUMBER: number,
		PR_HEAD_SHA: sha,
		PREVIEW_URL: url,
		ARTIFACT_URL: artifactUrl,
		PLAYWRIGHT_SUMMARY: summary,
		PREVIEW_CAPTURE_STATUS: rawStatus,
	} = process.env;
	const status = captureStatus(rawStatus);
	if (
		!token ||
		!repository ||
		!number ||
		!sha ||
		!/^[\w.-]+\/[\w.-]+$/.test(repository) ||
		!/^[1-9]\d*$/.test(number) ||
		!/^[a-f0-9]{40}$/.test(sha ?? "") ||
		(status === "passed" && (!url || !artifactUrl || !summary))
	) {
		throw new Error("Missing or invalid preview comment input");
	}
	await upsertComment({
		repository,
		number,
		token,
		body: commentBody({
			sha,
			status,
			...(url ? { url } : {}),
			...(artifactUrl ? { artifactUrl } : {}),
			...(summary ? { summary } : {}),
		}),
	});
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	main().catch((error) => {
		process.stderr.write(`${error.message}\n`);
		process.exitCode = 1;
	});
}
