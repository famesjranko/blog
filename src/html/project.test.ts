import { describe, expect, it } from "vitest";
import type { Project } from "../content.js";
import {
	originLabel,
	projectEntry,
	projectIndexPage,
	projectPage,
} from "./project.js";

function sampleProject(overrides: Partial<Project> = {}): Project {
	return {
		title: "Connect-4 web",
		description: "A Lisp web service.",
		date: new Date("2026-03-15T00:00:00Z"),
		origin: "personal",
		repo: "https://github.com/famesjranko/Connect4-Lisp-Web",
		stack: ["lisp", "redis"],
		predecessor: undefined,
		featured: false,
		draft: false,
		slug: "connect4-lisp-web",
		html: "<p>Body.</p>",
		sourcePath: "content/projects/connect4-lisp-web.md",
		...overrides,
	};
}

describe("originLabel", () => {
	it("labels university origins", () => {
		expect(originLabel("university")).toBe("University project");
	});

	it("labels personal origins", () => {
		expect(originLabel("personal")).toBe("Personal project");
	});
});

describe("projectEntry", () => {
	it("links the card title to the project page", () => {
		const html = projectEntry(sampleProject());
		expect(html).toContain('<article class="card">');
		expect(html).toContain('href="/projects/connect4-lisp-web/"');
		expect(html).toContain("Connect-4 web");
	});

	it("shows the origin badge, stack, and date", () => {
		const html = projectEntry(sampleProject());
		expect(html).toContain("Personal project");
		expect(html).toContain("lisp");
		expect(html).toContain("15 Mar 2026");
	});

	it("omits the stack block when the project has none", () => {
		const html = projectEntry(sampleProject({ stack: [] }));
		expect(html).toContain("Connect-4 web");
		expect(html).not.toContain("entry-topics");
	});

	it("omits the description when absent", () => {
		const html = projectEntry(sampleProject({ description: undefined }));
		expect(html).toContain("Connect-4 web");
		expect(html).not.toContain("entry-desc");
	});

	it("escapes titles", () => {
		const html = projectEntry(sampleProject({ title: "<evil>" }));
		expect(html).toContain("&lt;evil&gt;");
		expect(html).not.toContain("<evil>");
	});
});

describe("projectIndexPage", () => {
	it("renders a card grid with a project count", () => {
		const html = projectIndexPage([
			sampleProject(),
			sampleProject({ slug: "other", title: "Other" }),
		]);
		expect(html).toContain('<ol class="card-grid">');
		expect(html).toContain("2 projects");
	});

	it("uses singular wording for a single project", () => {
		expect(projectIndexPage([sampleProject()])).toContain("1 project");
	});
});

describe("projectPage", () => {
	it("constrains the article to the shared content column", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('<div class="wrap"><article class="prose">');
	});

	it("links the shared and prose stylesheets", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('<link rel="stylesheet" href="/styles.css">');
		expect(html).toContain('<link rel="stylesheet" href="/prose.css">');
	});

	it("links the repository when present", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain("https://github.com/famesjranko/Connect4-Lisp-Web");
	});

	it("omits the repository link when absent", () => {
		const html = projectPage(sampleProject({ repo: undefined }));
		expect(html).toContain("Connect-4 web");
		expect(html).not.toContain("Repository");
	});

	it("links the predecessor project when present", () => {
		const html = projectPage(
			sampleProject({ predecessor: "connect4-heuristic" }),
		);
		expect(html).toContain('href="/projects/connect4-heuristic/"');
	});

	it("omits the predecessor block when absent", () => {
		const html = projectPage(sampleProject());
		expect(html).not.toContain("project-predecessor");
	});
});
