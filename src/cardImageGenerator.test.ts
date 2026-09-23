import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateCardImages } from "./cardImageGenerator.js";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), "card-images-"));
	temporaryRoots.push(root);
	return root;
}

afterEach(async () => {
	await Promise.all(
		temporaryRoots.splice(0).map((root) =>
			rm(root, {
				recursive: true,
				force: true,
			}),
		),
	);
});

describe("generateCardImages", () => {
	it("rejects the build when a planned source is missing", async () => {
		const root = await temporaryRoot();
		await expect(
			generateCardImages(
				[
					{
						slug: "dreyfus-review",
						cover: "/img/essays/dreyfus-review/cover.jpg",
					},
				],
				{
					sourceRoot: path.join(root, "missing-static"),
					outDir: path.join(root, "dist"),
				},
			),
		).rejects.toThrow();
	});
});
