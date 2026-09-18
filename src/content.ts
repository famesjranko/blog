import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { glob } from "tinyglobby";
import { renderMarkdown } from "./markdown.js";
import {
	type EssayMeta,
	RawFrontmatterSchema,
	normalizeFrontmatter,
} from "./schema.js";

export interface Essay extends EssayMeta {
	slug: string;
	html: string;
	sourcePath: string;
}

export function makeSlug(filePath: string): string {
	const base = path.basename(filePath, path.extname(filePath));
	return base
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export async function loadEssay(filePath: string): Promise<Essay> {
	const source = await readFile(filePath, "utf8");
	const { data, content } = matter(source);
	const raw = RawFrontmatterSchema.parse(data);
	const meta = normalizeFrontmatter(raw);
	return {
		...meta,
		slug: makeSlug(filePath),
		html: renderMarkdown(content),
		sourcePath: filePath,
	};
}

export async function loadEssays(
	pattern = "content/essays/**/*.md",
): Promise<Essay[]> {
	const files = await glob(pattern);
	const essays = await Promise.all(files.map((f) => loadEssay(f)));
	return essays
		.filter((e) => !e.draft)
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}
