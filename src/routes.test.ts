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

describe("generateSite rss", () => {
	it("names the channel after the site and describes each item", async () => {
		const dir = await generate([sampleEssay()]);
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(rss).toContain("<title>Andrew J. McDonald</title>");
		expect(rss).toContain("<description>A short description.</description>");
		expect(rss).toContain(
			'<guid isPermaLink="true">https://famesjranko.github.io/essays/on-mind/</guid>',
		);
	});

	it("escapes markup in titles and descriptions", async () => {
		const dir = await generate([
			sampleEssay({ title: "A & B <c>", description: 'Say "hi" & <b>' }),
		]);
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(rss).toContain("<title>A &amp; B &lt;c&gt;</title>");
		expect(rss).toContain("Say &quot;hi&quot; &amp; &lt;b&gt;");
		expect(rss).not.toContain("<c>");
	});

	it("dates the build from the newest essay, not the clock", async () => {
		const dir = await generate([
			sampleEssay({ slug: "old", date: new Date("2019-01-01T00:00:00Z") }),
			sampleEssay(),
		]);
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(rss).toContain(
			"<lastBuildDate>Thu, 14 May 2020 00:00:00 GMT</lastBuildDate>",
		);
	});

	it("points the self link at the feed's own absolute URL", async () => {
		vi.stubEnv("SITE_ORIGIN", "https://example.com");
		vi.stubEnv("BASE_PATH", "/blog");
		const dir = await generate([sampleEssay()]);
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		expect(rss).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
		expect(rss).toContain(
			'<atom:link href="https://example.com/blog/rss.xml" rel="self" type="application/rss+xml"/>',
		);
	});
});

describe("generateSite drafts", () => {
	it("keeps drafts out of the feed and sitemap while still writing their pages", async () => {
		const dir = await generate(
			[
				sampleEssay(),
				sampleEssay({
					slug: "wip",
					title: "WIP",
					draft: true,
					topics: ["Only Draft"],
				}),
			],
			[sampleProject({ draft: true })],
		);
		const rss = await readFile(path.join(dir, "rss.xml"), "utf8");
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(rss).toContain("essays/on-mind/");
		expect(rss).not.toContain("essays/wip/");
		expect(sitemap).toContain("essays/on-mind/");
		expect(sitemap).not.toContain("essays/wip/");
		expect(sitemap).not.toContain("projects/connect4-lisp-web/");
		expect(sitemap).not.toContain("topics/only-draft/");
		await expect(
			stat(path.join(dir, "essays/wip/index.html")),
		).resolves.toBeTruthy();
		await expect(
			stat(path.join(dir, "topics/only-draft/index.html")),
		).resolves.toBeTruthy();
	});
});

describe("generateSite not-found page", () => {
	it("writes a styled 404 page at the site root", async () => {
		vi.stubEnv("BASE_PATH", "/blog");
		const dir = await generate([sampleEssay()]);
		const html = await readFile(path.join(dir, "404.html"), "utf8");
		expect(html).toContain("<title>404 — Page not found</title>");
		expect(html).toContain('<link rel="stylesheet" href="/blog/css/main.css">');
		expect(html).toContain('href="/blog/"');
		expect(html).toContain('href="/blog/essays/"');
	});

	it("keeps the 404 page out of the sitemap", async () => {
		const dir = await generate([sampleEssay()]);
		const sitemap = await readFile(path.join(dir, "sitemap.xml"), "utf8");
		expect(sitemap).not.toContain("404");
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
