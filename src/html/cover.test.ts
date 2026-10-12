import { describe, expect, it, vi } from "vitest";
import { type CoverPiece, cardClass, cardCover } from "./cover.js";

function piece(
	cover: string | undefined,
	coverAlt: string | undefined,
	slug: string,
	draft = false,
): CoverPiece {
	return { cover, coverAlt, slug, draft };
}

describe("cardCover dimensions", () => {
	it("sizes a shipped cover image", () => {
		const html = cardCover(
			piece("/img/projects/connect4-lisp-web/cover.jpg", "c", "c"),
		);
		expect(html).toContain('width="1512" height="630"');
	});

	it("leaves an unknown cover unsized", () => {
		const html = cardCover(piece("/img/essays/x/cover.jpg", "x", "x"));
		expect(html).not.toContain("width=");
	});
});

describe("cardCover responsive sources", () => {
	it("puts AVIF before WebP with matching candidates and sizes", () => {
		const html = cardCover(
			piece(
				"/img/essays/dreyfus-review/cover.jpg",
				"transformations",
				"dreyfus-review",
			),
		);
		expect(html).toContain("<picture>");
		const sizes =
			"(min-width: 73rem) 33.25rem, (min-width: 62.5rem) calc(50vw - 3.25rem), (min-width: 42rem) calc(46vw - 0.75rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";
		const avif =
			'<source type="image/avif" srcset="/img/essays/dreyfus-review/cover.card-480w.avif 480w, /img/essays/dreyfus-review/cover.card-720w.avif 720w, /img/essays/dreyfus-review/cover.card-944w.avif 944w"';
		const webp =
			'<source type="image/webp" srcset="/img/essays/dreyfus-review/cover.card-480w.webp 480w, /img/essays/dreyfus-review/cover.card-720w.webp 720w, /img/essays/dreyfus-review/cover.card-944w.webp 944w"';
		expect(html).toContain(`${avif} sizes="${sizes}">`);
		expect(html).toContain(`${webp} sizes="${sizes}">`);
		expect(html.indexOf(avif)).toBeLessThan(html.indexOf(webp));
		expect(html).toContain('src="/img/essays/dreyfus-review/cover.jpg"');
		expect(html).toContain('width="1313" height="533"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('decoding="async"');
	});

	it("prefixes every candidate and the fallback with the base path", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover(
				piece("/img/essays/dreyfus-review/cover.jpg", "x", "x"),
			);
			expect(html).toContain(
				'srcset="/blog/img/essays/dreyfus-review/cover.card-480w.avif 480w',
			);
			expect(html).toContain(
				", /blog/img/essays/dreyfus-review/cover.card-944w.webp 944w",
			);
			expect(html).toContain('src="/blog/img/essays/dreyfus-review/cover.jpg"');
		} finally {
			vi.unstubAllEnvs();
		}
	});
});

describe("cardCover compatibility", () => {
	it("renders an unknown JPEG cover as a bare img", () => {
		// Given a card whose JPEG cover is not in the image size table.
		const card = piece("/img/essays/x/cover.jpg", "x", "x");

		// When the card cover is rendered.
		const html = cardCover(card);

		// Then the cover is a bare img with its source.
		expect(html).toContain('<img src="/img/essays/x/cover.jpg"');
		// And no picture element or WebP source points at a missing file.
		expect(html).not.toContain("<picture>");
		expect(html).not.toContain(".webp");
	});

	it("leaves png covers as plain img elements", () => {
		const html = cardCover(piece("/img/essays/x/table1.png", "t", "x"));
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/essays/x/table1.png"');
	});

	it("leaves svg covers as plain img elements", () => {
		const html = cardCover(piece("/img/projects/c/diagram.svg", "d", "c"));
		expect(html).not.toContain("<picture>");
		expect(html).toContain('src="/img/projects/c/diagram.svg"');
	});
});

describe("cardCover", () => {
	it("renders the explicit cover image with lazy loading", () => {
		const html = cardCover(
			piece("/img/essays/jtb-knowledge/cover.jpg", "jtb", "jtb-knowledge"),
		);
		expect(html).toContain('class="card-media"');
		expect(html).toContain('src="/img/essays/jtb-knowledge/cover.jpg"');
		expect(html).toContain('alt="jtb"');
		expect(html).toContain('loading="lazy"');
	});

	it("falls back to the slug's rendered placeholder with an empty alt", () => {
		const html = cardCover(piece(undefined, undefined, "other"));
		expect(html).toContain('<img src="/img/placeholders/other.jpg" alt=""');
		expect(html).not.toContain(".webp");
		expect(html).not.toContain("card-media--placeholder");
	});

	it("ignores coverAlt when the cover itself is absent", () => {
		const html = cardCover(piece(undefined, "described", "other"));
		expect(html).toContain('alt=""');
		expect(html).not.toContain("described");
	});

	it("emits the placeholder's size once it is in the table", () => {
		// mediastack ships a rendered placeholder, so its size is known.
		const html = cardCover(piece(undefined, undefined, "mediastack"));
		expect(html).toContain('width="640" height="360"');
	});

	it("prefixes the placeholder path under BASE_PATH", () => {
		vi.stubEnv("BASE_PATH", "/blog");
		try {
			const html = cardCover(piece(undefined, undefined, "other"));
			expect(html).toContain('src="/blog/img/placeholders/other.jpg"');
		} finally {
			vi.unstubAllEnvs();
		}
	});

	it("escapes cover alt text", () => {
		const html = cardCover(piece("/img/x.jpg", "<evil>", "x"));
		expect(html).toContain('alt="&lt;evil&gt;"');
		expect(html).not.toContain('alt="<evil>"');
	});
});

describe("draft marking", () => {
	it("overlays a draft badge on the art of a draft", () => {
		const html = cardCover(piece(undefined, undefined, "other", true));
		expect(html).toContain('<span class="draft-badge">Draft</span></div>');
		expect(html.indexOf("</picture>")).toBeLessThan(
			html.indexOf("draft-badge"),
		);
	});

	it("badges a draft with an explicit cover too", () => {
		const html = cardCover(piece("/img/x.png", "x", "x", true));
		expect(html).toContain('<img src="/img/x.png"');
		expect(html).toContain("draft-badge");
	});

	it("leaves published art unbadged", () => {
		expect(cardCover(piece(undefined, undefined, "other"))).not.toContain(
			"draft",
		);
	});

	it("adds the card modifier only for drafts", () => {
		expect(cardClass({ draft: true })).toBe("card card-draft");
		expect(cardClass({ draft: false })).toBe("card");
	});
});
