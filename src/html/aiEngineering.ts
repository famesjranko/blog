import type { Essay } from "../content.js";
import { essayEntry } from "./index.js";
import { page } from "./layout.js";

export function aiEngineeringIndexPage(articles: Essay[]): string {
	const entries = articles.map((article) => essayEntry(article)).join("\n");
	const count =
		articles.length === 1 ? "1 article" : `${articles.length} articles`;
	const description =
		"How I build and work with coding agents, tools and AI infrastructure.";
	const body =
		entries === ""
			? "<p>Articles are in progress.</p>"
			: `<ol class="card-grid">${entries}</ol>`;
	return page({
		title: "AI Engineering",
		canonicalPath: "/ai-engineering/",
		description,
		content: `<div class="wrap index-page"><h1>AI Engineering</h1><p>${description}</p><p class="index-count">${count}</p>${body}</div>`,
	});
}
