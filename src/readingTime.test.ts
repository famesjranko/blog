import { describe, expect, it } from "vitest";
import { readingMinutes } from "./readingTime.js";

describe("readingMinutes", () => {
	it("gives an empty body one minute", () => {
		// Given an empty Markdown body.
		const body = "";

		// When its reading time is estimated.
		const minutes = readingMinutes(body);

		// Then the estimate is one minute.
		expect(minutes).toBe(1);
	});

	it("counts exactly 200 words as one minute", () => {
		// Given a Markdown body with exactly 200 words.
		const body = Array(200).fill("word").join(" ");

		// When its reading time is estimated.
		const minutes = readingMinutes(body);

		// Then the estimate is one minute.
		expect(minutes).toBe(1);
	});

	it("rounds 201 words up to two minutes", () => {
		// Given a Markdown body with 201 words.
		const body = Array(201).fill("word").join(" ");

		// When its reading time is estimated.
		const minutes = readingMinutes(body);

		// Then the estimate is two minutes.
		expect(minutes).toBe(2);
	});

	it("does not count fenced code", () => {
		// Given 200 prose words and a fenced block with 201 words.
		const prose = Array(200).fill("word").join(" ");
		const code = Array(201).fill("code").join(" ");
		const body = `${prose}\n\n\`\`\`ts\n${code}\n\`\`\``;

		// When its reading time is estimated.
		const minutes = readingMinutes(body);

		// Then the fenced block adds no reading time.
		expect(minutes).toBe(1);
	});
});
