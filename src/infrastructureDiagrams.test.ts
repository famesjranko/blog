import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.js";

const article = readFileSync(
	"content/ai-engineering/ai-infrastructure.md",
	"utf8",
);

function renderedFigures(): string[] {
	const source = article.replace(/^---[\s\S]*?---\n/, "");
	return (
		renderMarkdown(source).match(
			/<figure class="infra-responsive">[\s\S]*?<\/figure>/g,
		) ?? []
	);
}

function descriptionsOf(figure: string): string[] {
	return [...figure.matchAll(/<desc\b[^>]*>([^<]+)<\/desc>/g)].map(
		(match) => match[1] ?? "",
	);
}

function captionOf(figure: string): string {
	return /<figcaption>([^<]+)<\/figcaption>/.exec(figure)?.[1] ?? "";
}

function expectNamedAlternatives(figure: string): void {
	const alternatives = figure.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [];
	expect(alternatives).toHaveLength(2);
	for (const svg of alternatives) {
		const ids = /aria-labelledby="([^"]+)"/.exec(svg)?.[1]?.split(" ") ?? [];
		expect(ids).toHaveLength(2);
		for (const id of ids) {
			expect(svg).toMatch(new RegExp(`<(title|desc) id="${id}">[^<]+</`));
		}
	}
}

describe("responsive infrastructure figures", () => {
	it("renders two complete accessible figures through the article renderer", () => {
		// Given the actual article and its four independent SVG sources.
		const figures = renderedFigures();

		// When the existing Markdown pipeline renders the article.
		const markup = figures.join("");
		const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(
			(match) => match[1],
		);

		// Then each logical figure has two named alternatives and one caption.
		expect(figures).toHaveLength(2);
		for (const figure of figures) {
			expect(figure.match(/<figure\b/g)).toHaveLength(1);
			expect(figure).not.toMatch(/<img\b/);
			expect(figure.match(/<figcaption>/g)).toHaveLength(1);
			expect(figure.match(/\binfra-wide\b/g)).toHaveLength(1);
			expect(figure.match(/\binfra-narrow\b/g)).toHaveLength(1);
			expectNamedAlternatives(figure);
		}
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("infrastructure figure facts", () => {
	it("keeps homelab resource facts accessible", () => {
		// Given the homelab figure from the actual article renderer.
		const figure = renderedFigures()[0] ?? "";

		// When a reader uses an accessible description and its shared caption.
		const descriptions = descriptionsOf(figure);
		const caption = captionOf(figure);

		// Then descriptions retain the hardware facts and the caption qualifies resource availability.
		expect(descriptions).toHaveLength(2);
		for (const reading of descriptions) {
			expect(reading).toMatch(/SSH on the lab network/);
			expect(reading).toMatch(/available when needed/);
			expect(reading).toMatch(/pass through to one VM/);
			expect(reading).toMatch(/both VMs reach/);
			expect(reading).toMatch(/separate (physical|TrueNAS) machine/);
			expect(reading).toMatch(/optional NFS/);
		}
		expect(caption).toMatch(/available when needed/);
	});

	it("keeps llmtrim optional and on the model-request path only", () => {
		// Given the coding figure from the actual article renderer.
		const figure = renderedFigures()[1] ?? "";

		// When a reader uses an accessible description and its shared caption.
		const descriptions = descriptionsOf(figure);
		const caption = captionOf(figure);

		// Then descriptions retain model access facts and the concise caption qualifies the diagram.
		expect(descriptions).toHaveLength(2);
		for (const reading of descriptions) {
			expect(reading).toMatch(
				/model requests[^.]*directly[^.]*through llmtrim/i,
			);
			expect(reading).toMatch(/llmtrim, an optional proxy/);
			expect(reading).toMatch(/own provider login/);
			expect(reading).toMatch(/proxy on the workbench/);
		}
		expect(caption).toMatch(/optional local llmtrim proxy/);
		expect(caption).toMatch(/Response paths are omitted\./);
	});
});
