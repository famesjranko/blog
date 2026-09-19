import { describe, expect, it, vi } from "vitest";
import { cardCover } from "./layout.js";

describe("cardCover webp sidecars", () => {
	it("wraps jpeg covers in a picture element with a webp source", () => {
		const html = cardCover(
			"/img/essays/jtb-knowledge/cover.jpg",
			"jtb",
			"jtb-knowledge",
		);
		expect(html).toContain("<picture>");
		expect(html).toContain(
			'<source type="image/webp" srcset="/img/essays/jtb-knowledge/cover.webp">',
		);
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('decoding="async"');
	});

	it("prefixes both the webp source and the fallback with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover("/img/essays/x/cover.jpg", "x", "x");
			expect(html).toContain('srcset="/blog/img/essays/x/cover.webp"');
			expect(html).toContain('src="/blog/img/essays/x/cover.jpg"');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("leaves png covers as plain img elements", () => {
		const html = cardCover("/img/essays/x/table1.png", "t", "x");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/essays/x/table1.png"');
	});

	it("leaves svg covers as plain img elements", () => {
		const html = cardCover("/img/projects/c/diagram.svg", "d", "c");
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/projects/c/diagram.svg"');
	});
});
