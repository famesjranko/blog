import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { glob } from "tinyglobby";
import { markdownImageSources, renderMarkdown } from "./markdown.js";
import { readingMinutes } from "./readingTime.js";
import {
	type EssayMeta,
	type ProjectMeta,
	RawFrontmatterSchema,
	RawProjectFrontmatterSchema,
	normalizeFrontmatter,
	normalizeProjectFrontmatter,
} from "./schema.js";

/**
 * The writing sections. Notes are shorter pieces that share the essay
 * model; the section alone decides where a piece lives.
 */
export type WritingSection = "essays" | "notes";

export interface Essay extends EssayMeta {
	section: WritingSection;
	slug: string;
	html: string;
	readingMinutes: number;
	/** Image sources in the body, for the renditions the build generates. */
	images: string[];
	sourcePath: string;
}

export interface Project extends ProjectMeta {
	slug: string;
	html: string;
	readingMinutes: number;
	/** Image sources in the body, for the renditions the build generates. */
	images: string[];
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

/** Root-relative URL path of an essay or note page. */
export function writingPath(piece: Pick<Essay, "section" | "slug">): string {
	return `/${piece.section}/${piece.slug}/`;
}

export async function loadEssay(
	filePath: string,
	section: WritingSection = "essays",
): Promise<Essay> {
	const source = await readFile(filePath, "utf8");
	const { data, content } = matter(source);
	const raw = RawFrontmatterSchema.parse(data);
	const meta = normalizeFrontmatter(raw);
	return {
		...meta,
		section,
		slug: makeSlug(filePath),
		html: renderMarkdown(content),
		readingMinutes: readingMinutes(content),
		images: markdownImageSources(content),
		sourcePath: filePath,
	};
}

export async function loadEssays(
	pattern = "content/essays/**/*.md",
	includeDrafts = false,
	section: WritingSection = "essays",
): Promise<Essay[]> {
	const files = await glob(pattern);
	const essays = await Promise.all(files.map((f) => loadEssay(f, section)));
	return essays
		.filter((e) => includeDrafts || !e.draft)
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function loadNotes(includeDrafts = false): Promise<Essay[]> {
	return loadEssays("content/notes/**/*.md", includeDrafts, "notes");
}

export async function loadProject(filePath: string): Promise<Project> {
	const source = await readFile(filePath, "utf8");
	const { data, content } = matter(source);
	const raw = RawProjectFrontmatterSchema.parse(data);
	const meta = normalizeProjectFrontmatter(raw);
	return {
		...meta,
		slug: makeSlug(filePath),
		html: renderMarkdown(content),
		readingMinutes: readingMinutes(content),
		images: markdownImageSources(content),
		sourcePath: filePath,
	};
}

export async function loadProjects(
	pattern = "content/projects/**/*.md",
	includeDrafts = false,
): Promise<Project[]> {
	const files = await glob(pattern);
	const projects = await Promise.all(files.map((f) => loadProject(f)));
	return projects
		.filter((p) => includeDrafts || !p.draft)
		.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export interface Featureable {
	featured: boolean;
	date: Date;
}

/**
 * Homepage picks: newest flagged items first, backfilled with the newest
 * unflagged items so a pick exists whenever the collection is non-empty.
 */
export function pickFeatured<T extends Featureable>(
	items: T[],
	count: number,
): T[] {
	const newestFirst = (a: T, b: T) => b.date.getTime() - a.date.getTime();
	const flagged = items.filter((i) => i.featured).sort(newestFirst);
	const unflagged = items.filter((i) => !i.featured).sort(newestFirst);
	return [...flagged, ...unflagged].slice(0, count);
}
