import { afterEach, describe, expect, it, vi } from "vitest";
import { basePath, siteUrl } from "./site.js";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("basePath", () => {
	it("is empty by default (user site / local preview)", () => {
		expect(basePath()).toBe("");
	});

	it("normalizes missing leading slash and trailing slashes", () => {
		vi.stubEnv("BASE_PATH", "personal_blog/");
		expect(basePath()).toBe("/personal_blog");
	});
});

describe("siteUrl", () => {
	it("passes paths through when no base path is set", () => {
		expect(siteUrl("/essays/")).toBe("/essays/");
	});

	it("prefixes paths with the base path", () => {
		vi.stubEnv("BASE_PATH", "/personal_blog");
		expect(siteUrl("/essays/")).toBe("/personal_blog/essays/");
		expect(siteUrl("/styles.css")).toBe("/personal_blog/styles.css");
	});
});
