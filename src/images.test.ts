import { describe, expect, it } from "vitest";
import { imageSize, isInternalJpeg } from "./images.js";

describe("imageSize", () => {
	it("returns the pixel size of a shipped internal image", () => {
		expect(imageSize("/img/essays/dretske-closure/euler-diagram.svg")).toEqual({
			width: 376,
			height: 376,
		});
	});

	it("returns undefined for an internal path that ships no image", () => {
		expect(imageSize("/img/essays/x/cover.jpg")).toBeUndefined();
	});

	it("returns undefined for external and relative sources", () => {
		expect(imageSize("https://example.com/foo.jpg")).toBeUndefined();
		expect(imageSize("img/foo.jpg")).toBeUndefined();
	});
});

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
