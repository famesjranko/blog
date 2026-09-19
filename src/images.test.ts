import { describe, expect, it } from "vitest";
import { isInternalJpeg, webpSrc } from "./images.js";

describe("isInternalJpeg", () => {
	it("accepts root-relative jpg paths", () => {
		expect(isInternalJpeg("/img/essays/x/cover.jpg")).toBe(true);
	});

	it("accepts root-relative jpeg paths", () => {
		expect(isInternalJpeg("/img/essays/x/cover.jpeg")).toBe(true);
	});

	it("rejects png sources", () => {
		expect(isInternalJpeg("/img/essays/x/table1.png")).toBe(false);
	});

	it("rejects svg sources", () => {
		expect(isInternalJpeg("/img/projects/c/diagram.svg")).toBe(false);
	});

	it("rejects already-generated webp sources", () => {
		expect(isInternalJpeg("/img/essays/x/cover.webp")).toBe(false);
	});

	it("rejects external urls even with a jpeg extension", () => {
		expect(isInternalJpeg("https://example.com/foo.jpg")).toBe(false);
	});

	it("rejects protocol-relative urls", () => {
		expect(isInternalJpeg("//example.com/foo.jpg")).toBe(false);
	});

	it("rejects relative paths", () => {
		expect(isInternalJpeg("img/foo.jpg")).toBe(false);
	});
});

describe("webpSrc", () => {
	it("maps a jpg source to its same-name webp sidecar", () => {
		expect(webpSrc("/img/essays/x/cover.jpg")).toBe("/img/essays/x/cover.webp");
	});

	it("maps a jpeg source to its same-name webp sidecar", () => {
		expect(webpSrc("/img/essays/x/cover.jpeg")).toBe(
			"/img/essays/x/cover.webp",
		);
	});

	it("returns undefined for png sources", () => {
		expect(webpSrc("/img/essays/x/table1.png")).toBeUndefined();
	});

	it("returns undefined for svg sources", () => {
		expect(webpSrc("/img/projects/c/diagram.svg")).toBeUndefined();
	});

	it("returns undefined for external urls", () => {
		expect(webpSrc("https://example.com/foo.jpg")).toBeUndefined();
	});

	it("returns undefined for relative paths", () => {
		expect(webpSrc("img/foo.jpg")).toBeUndefined();
	});
});
