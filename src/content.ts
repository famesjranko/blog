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

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function makeSlug(filePath: string): string {
	return slugify(path.basename(filePath, path.extname(filePath)));
}

/**
 * URL slug for a frontmatter topic. Throws on empty results so a
 * garbage topic fails the build loudly instead of producing /topics//.
 */
export function topicSlug(topic: string): string {
	const slug = slugify(topic);
	if (slug === "") {
		throw new Error(`topic ${JSON.stringify(topic)} produces an empty slug`);
	}
	return slug;
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
