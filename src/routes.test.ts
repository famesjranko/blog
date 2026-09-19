import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Essay, Project } from "./content.js";
import { generateSite } from "./routes.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

function sampleEssay(overrides: Partial<Essay> = {}): Essay {
	return {
		title: "On Mind",
		description: "A short description.",
		date: new Date("2020-05-14T00:00:00Z"),
		topics: ["Philosophy of Mind"],
		philosophers: [],
		featured: false,
		draft: false,
		slug: "on-mind",
		html: "<p>Body.</p>",
		sourcePath: "content/essays/on-mind.md",
		...overrides,
	};
}

async function generate(
	essays: Essay[],
	projects: Project[] = [],
): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "blog-routes-"));
	await generateSite(essays, projects, dir);
	return dir;
}

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

describe("generateSite topics", () => {
	it("writes topic pages at slugified paths", async () => {
		const dir = await generate([sampleEssay()]);
		const html = await readFile(
			path.join(dir, "topics/philosophy-of-mind/index.html"),
			"utf8",
		);
		expect(html).toContain("On Mind");
	});

	it("never writes raw topic names with spaces", async () => {
		const dir = await generate([sampleEssay()]);
		await expect(
			stat(path.join(dir, "topics/Philosophy of Mind")),
		).rejects.toThrow();
	});

	it("lists topic URLs in the sitemap", async () => {
		const dir = await generate([sampleEssay()]);
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(sitemap).toContain("topics/philosophy-of-mind/");
	});

	it("links essay entries to slugified topic pages", async () => {
		const dir = await generate([sampleEssay()]);
		const index = await readFile(path.join(dir, "essays/index.html"), "utf8");
		expect(index).toContain("/topics/philosophy-of-mind/");
	});
});

describe("generateSite feeds", () => {
	it("writes absolute canonical URLs including the deployment base path", async () => {
		vi.stubEnv("SITE_ORIGIN", "https://example.com");
		vi.stubEnv("BASE_PATH", "/blog");
		const dir = await generate([sampleEssay()]);
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(sitemap).toContain(
			"<loc>https://example.com/blog/essays/on-mind/</loc>",
		);
		expect(rss).toContain(
			"<link>https://example.com/blog/essays/on-mind/</link>",
		);
	});
});

describe("generateSite slugs", () => {
	it("rejects an empty essay slug before writing pages", async () => {
		await expect(generate([sampleEssay({ slug: "" })])).rejects.toThrow(
			/essay.*empty slug/,
		);
	});

	it("rejects duplicate essay slugs and names both sources", async () => {
		const duplicate = sampleEssay({ sourcePath: "content/essays/other.md" });
		await expect(generate([sampleEssay(), duplicate])).rejects.toThrow(
			/on-mind\.md.*other\.md/,
		);
	});

	it("rejects duplicate project slugs and names both sources", async () => {
		const duplicate = sampleProject({
			sourcePath: "content/projects/other.md",
		});
		await expect(generate([], [sampleProject(), duplicate])).rejects.toThrow(
			/connect4-lisp-web\.md.*other\.md/,
		);
	});
});

describe("generateSite projects", () => {
	it("writes project pages and the projects index", async () => {
		const dir = await generate([], [sampleProject()]);
		const html = await readFile(
			path.join(dir, "projects/connect4-lisp-web/index.html"),
			"utf8",
		);
		expect(html).toContain("Connect-4 web");
		const index = await readFile(path.join(dir, "projects/index.html"), "utf8");
		expect(index).toContain("Connect-4 web");
	});

	it("lists project URLs in the sitemap", async () => {
		const dir = await generate([], [sampleProject()]);
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(sitemap).toContain("projects/");
		expect(sitemap).toContain("projects/connect4-lisp-web/");
	});

	it("shows the featured projects on the homepage", async () => {
		const dir = await generate([sampleEssay()], [sampleProject()]);
		const home = await readFile(path.join(dir, "index.html"), "utf8");
		expect(home).toContain("Featured projects");
		expect(home).toContain("Connect-4 web");
	});

	it("resolves predecessor links between projects", async () => {
		const dir = await generate(
			[],
			[
				sampleProject({
					slug: "connect4-heuristic",
					title: "Connect-4 heuristic",
					origin: "university",
				}),
				sampleProject({ predecessor: "connect4-heuristic" }),
			],
		);
		const html = await readFile(
			path.join(dir, "projects/connect4-lisp-web/index.html"),
			"utf8",
		);
		expect(html).toContain("/projects/connect4-heuristic/");
	});

	it("fails on a predecessor that matches no project", async () => {
		await expect(
			generate([], [sampleProject({ predecessor: "missing" })]),
		).rejects.toThrow(/unknown predecessor/);
	});
});
