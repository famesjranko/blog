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
		readingMinutes: 4,
		images: [],
		sourcePath: "content/projects/connect4-lisp-web.md",
		...overrides,
	};
}

describe("originLabel", () => {
	it("labels university origins", () => {
		expect(originLabel("university")).toBe("University project");
	});

	it("labels professional origins", () => {
		// Given a project done as paid work.
		const origin = "professional";

		// When its origin is labelled.
		const label = originLabel(origin);

		// Then the label names it a professional project.
		expect(label).toBe("Professional project");
	});

	it("labels personal origins", () => {
		expect(originLabel("personal")).toBe("Personal project");
	});
});

describe("projectEntry card", () => {
	it("links the card title to the project page", () => {
		const html = projectEntry(sampleProject());
		expect(html).toContain('<article class="card">');
		expect(html).toContain('href="/projects/connect4-lisp-web/"');
		expect(html).toContain('<span class="nowrap">Connect-4</span> web');
	});

	it("shows the origin badge and stack without a date", () => {
		const html = projectEntry(sampleProject());
		expect(html).toContain("Personal project");
		expect(html).toContain("lisp");
		expect(html).not.toContain("<time");
	});

	it("renders the slug's placeholder art when no cover is set", () => {
		const html = projectEntry(sampleProject({ slug: "mediastack" }));
		expect(html).toContain('src="/img/placeholders/mediastack.jpg"');
		expect(html).toContain(
			'srcset="/img/placeholders/mediastack.card-480w.webp 480w, /img/placeholders/mediastack.card-640w.webp 640w"',
		);
		expect(html).toContain('alt=""');
	});

	it("renders the explicit cover image when set", () => {
		const html = projectEntry(
			sampleProject({
				cover: "/img/projects/connect4-lisp-web/cover.jpg",
				coverAlt: "connect4",
			}),
		);
		expect(html).toContain('src="/img/projects/connect4-lisp-web/cover.jpg"');
		expect(html).toContain('alt="connect4"');
		expect(html).toContain('loading="lazy"');
	});

	it("never uses body images for the card", () => {
		const html = projectEntry(
			sampleProject({ html: '<p><img src="/img/x.svg" alt="x"></p>' }),
		);
		expect(html).not.toContain('src="/img/x.svg"');
		expect(html).toContain("/img/placeholders/connect4-lisp-web.jpg");
	});

	it("gives distinct placeholders to distinct slugs", () => {
		const first = projectEntry(sampleProject({ slug: "musicmeta" }));
		const second = projectEntry(sampleProject({ slug: "ip-camera" }));
		expect(first).toContain("/img/placeholders/musicmeta.jpg");
		expect(second).toContain("/img/placeholders/ip-camera.jpg");
	});
});

describe("projectEntry draft", () => {
	it("marks a draft card with a modifier class and a badge", () => {
		const html = projectEntry(sampleProject({ draft: true }));
		expect(html).toContain('<article class="card card-draft">');
		expect(html).toContain('<span class="draft-badge">Draft</span>');
	});
});

describe("projectEntry content", () => {
	it("omits the description when absent", () => {
		const html = projectEntry(sampleProject({ description: undefined }));
		expect(html).toContain('<span class="nowrap">Connect-4</span> web');
		expect(html).not.toContain("entry-desc");
	});

	it("escapes titles", () => {
		const html = projectEntry(sampleProject({ title: "<evil>" }));
		expect(html).toContain("&lt;evil&gt;");
		expect(html).not.toContain("<evil>");
	});
});

describe("projectEntry meta structure", () => {
	it("keeps the facets row with the origin when the project has no stack", () => {
		const html = projectEntry(sampleProject({ stack: [] }));
		expect(html).toContain('<span class="nowrap">Connect-4</span> web');
		expect(html).toContain("entry-topics");
		expect(html).toContain("Personal project");
		expect(html).not.toContain("<span>lisp</span>");
	});

	it("renders facets without a date row", () => {
		const html = projectEntry(sampleProject());
		expect(html).toContain("entry-topics");
		expect(html).not.toContain("<time");
	});
});

describe("projectIndexPage", () => {
	it("emits a meta description for search snippets", () => {
		expect(projectIndexPage([sampleProject()])).toMatch(
			/<meta name="description" content="[^"]+">/,
		);
	});

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

	it("uses the shared index shell", () => {
		const html = projectIndexPage([sampleProject()]);
		expect(html).toContain('<div class="wrap index-page">');
		expect(html).toContain('<p class="index-count">');
	});
});

it("shows the estimate near the project title", () => {
	// Given a project with a four minute reading estimate.
	const project = sampleProject();

	// When its page is rendered.
	const html = projectPage(project);

	// Then the shared metadata line shows the origin, year, and estimate.
	expect(html).toContain(
		'<p class="article-meta">Personal project <span aria-hidden="true">·</span> <time datetime="2026-03-15">2026</time> <span aria-hidden="true">·</span> 4 min read</p>\n<h1><span class="nowrap">Connect-4</span> web</h1>',
	);
});

describe("projectPage header", () => {
	it("constrains the article to the shared content column", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('<div class="wrap"><article class="prose project">');
		expect(html).toContain('<div class="project-grid">');
	});

	it("shows the origin and date in the shared metadata line", () => {
		// Given a dated personal project.
		const project = sampleProject();

		// When its page is rendered.
		const html = projectPage(project);

		// Then its origin and year appear in the common article metadata.
		expect(html).toContain('class="article-meta"');
		expect(html).toContain("Personal project");
		expect(html).toContain('<time datetime="2026-03-15">2026</time>');
	});

	it("uses the description as the lede and meta description", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('class="project-lede"');
		expect(html).toContain("A Lisp web service.");
		expect(html).toContain('<meta name="description"');
	});

	it("links shared, figure, project, and diagram styles", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('<link rel="stylesheet" href="/css/main.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/header.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/prose.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/figures.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/project.css">');
		expect(html).toContain('<link rel="stylesheet" href="/css/diagrams.css">');
		expect(html).not.toContain("/css/essay.css");
	});
});

describe("projectPage scripts", () => {
	it("loads the script that turns video posters into players", () => {
		// Given a project.
		const project = sampleProject();

		// When its page is rendered.
		const html = projectPage(project);

		// Then the page loads the video script.
		expect(html).toContain('<script src="/js/video-embed.js" defer></script>');
	});
});

describe("projectPage status", () => {
	it("prefixes the metadata with a draft label for drafts only", () => {
		// Given draft and published versions of one project.
		const draftProject = sampleProject({ draft: true });
		const publishedProject = sampleProject();

		// When both pages are rendered.
		const draft = projectPage(draftProject);
		const published = projectPage(publishedProject);

		// Then only the draft has a badge before the project origin.
		expect(draft).toContain(
			'<p class="article-meta"><span class="draft-eyebrow">Draft</span>Personal project',
		);
		expect(published).not.toContain("draft-eyebrow");
	});
});

describe("projectPage sidebar", () => {
	it("renders labeled facts in a sidebar before the body", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain('aria-label="Project facts"');
		expect(html).toContain("<dt>Stack</dt>");
		expect(html).toContain("<dt>Code</dt>");
		expect(html.indexOf("project-side")).toBeLessThan(
			html.indexOf("project-main"),
		);
	});

	it("omits the sidebar when there are no facts", () => {
		const html = projectPage(sampleProject({ stack: [], repo: undefined }));
		expect(html).toContain('<span class="nowrap">Connect-4</span> web');
		expect(html).not.toContain("project-side");
	});

	it("links the repository when present", () => {
		const html = projectPage(sampleProject());
		expect(html).toContain(
			'<a href="https://github.com/famesjranko/Connect4-Lisp-Web" target="_blank" rel="noopener noreferrer">Repository</a>',
		);
	});

	it("omits the repository link when absent", () => {
		const html = projectPage(sampleProject({ repo: undefined }));
		expect(html).toContain('<span class="nowrap">Connect-4</span> web');
		expect(html).not.toContain("Repository");
	});

	it("links the predecessor project when present", () => {
		const html = projectPage(
			sampleProject({ predecessor: "connect4-heuristic" }),
		);
		expect(html).toContain('href="/projects/connect4-heuristic/"');
		expect(html).toContain("<dt>Lineage</dt>");
	});

	it("omits the predecessor block when absent", () => {
		const html = projectPage(sampleProject());
		expect(html).not.toContain("project-predecessor");
	});
});
