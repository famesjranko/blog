import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const hook = resolve("scripts/hooks/commit-msg");

// Runs the hook as git does: one argument, the path of the message file.
function commitMsg(message: string): { status: number | null; stderr: string } {
	const dir = mkdtempSync(join(tmpdir(), "commit-msg-"));
	try {
		const file = join(dir, "COMMIT_EDITMSG");
		writeFileSync(file, message);
		const result = spawnSync("sh", [hook, file], { encoding: "utf8" });
		return { status: result.status, stderr: result.stderr };
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

describe("commit-msg accepted subjects", () => {
	it("accepts a typed subject", () => {
		// Given a subject with a known type
		const message = "feat: add pre-commit hooks\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is allowed
		expect(result.status).toBe(0);
	});

	it("accepts a path scope and a breaking-change mark", () => {
		// Given a subject whose scope contains a slash and a breaking mark
		const message = "fix(scripts/hooks)!: check the staged tree\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is allowed
		expect(result.status).toBe(0);
	});

	it("accepts the subject git writes when it reverts a revert", () => {
		// Given a Reapply subject from git revert
		const message = 'Reapply "feat: add pre-commit hooks"\n';

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is allowed
		expect(result.status).toBe(0);
	});

	it("reads the subject after leading comment lines", () => {
		// Given a message that starts with git's comment lines
		const message = "# Please enter the message\n\nchore: tidy\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the first non-comment line is the subject and passes
		expect(result.status).toBe(0);
	});
});

describe("commit-msg rejected subjects", () => {
	it("rejects a plain-prose subject", () => {
		// Given a subject with no type prefix
		const message = "Update readme\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is refused
		expect(result.status).toBe(1);
		// And the message names the rule
		expect(result.stderr).toContain("Conventional Commits");
	});

	it("rejects an unknown type", () => {
		// Given a subject with a type outside the repository's list
		const message = "essays: add a new piece\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is refused
		expect(result.status).toBe(1);
	});
});

describe("commit-msg attribution", () => {
	it("rejects an assistant co-author trailer", () => {
		// Given a valid subject with an assistant co-author trailer
		const message =
			"docs: tidy\n\nCo-authored-by: Claude <noreply@anthropic.com>\n";

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is refused for the attribution
		expect(result.status).toBe(1);
		// And the message names the vendor rule
		expect(result.stderr).toContain("names the assistant");
	});

	it("ignores the diff that commit -v appends below the scissors line", () => {
		// Given a valid message followed by a verbose diff that names the vendor
		const message = [
			"content: add an essay on information theory",
			"",
			"# ------------------------ >8 ------------------------",
			"# Do not modify or remove the line above.",
			"+Claude Shannon defined the entropy of a source.",
			"",
		].join("\n");

		// When the hook checks it
		const result = commitMsg(message);

		// Then the commit is allowed
		expect(result.status).toBe(0);
	});
});
