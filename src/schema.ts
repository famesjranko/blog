import { z } from "zod";

/** Canonical content model. This is the typed API Hugo never gave you. */
export const EssaySchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	date: z.coerce.date(),
	topics: z.array(z.string()).default([]),
	philosophers: z.array(z.string()).default([]),
	cover: z.string().min(1).optional(),
	coverAlt: z.string().optional(),
	featured: z.boolean().default(false),
	draft: z.boolean().default(false),
});

export type EssayMeta = z.infer<typeof EssaySchema>;

/**
 * Tolerates existing Hugo frontmatter on the way in.
 * New code must only consume EssayMeta, never this.
 */
export const RawFrontmatterSchema = z.object({
	title: z.string(),
	date: z.unknown(),
	description: z.string().optional(),
	featured: z.boolean().default(false),
	draft: z.boolean().default(false),
	// Hugo legacy taxonomy: topics wins over tags, which wins over categories.
	tags: z.array(z.string()).optional(),
	categories: z.array(z.string()).optional(),
	// Hugo legacy presentation metadata. Accepted but deliberately
	// discarded: never forwarded to EssayMeta.
	author: z.unknown().optional(),
	toc: z.unknown().optional(),
	type: z.unknown().optional(),
	images: z.unknown().optional(),
	// New fields
	topics: z.array(z.string()).optional(),
	philosophers: z.array(z.string()).optional(),
	cover: z.string().optional(),
	coverAlt: z.string().optional(),
});

export type RawFrontmatter = z.infer<typeof RawFrontmatterSchema>;

export function normalizeFrontmatter(
	raw: z.input<typeof RawFrontmatterSchema>,
): EssayMeta {
	return EssaySchema.parse({
		title: raw.title,
		description: raw.description,
		date: raw.date,
		topics: raw.topics ?? raw.tags ?? raw.categories ?? [],
		philosophers: raw.philosophers ?? [],
		cover: raw.cover,
		coverAlt: raw.coverAlt,
		featured: raw.featured ?? false,
		draft: raw.draft ?? false,
	});
}

/**
 * Project origin facet. The section split is writing-vs-building
 * (essays vs projects); university-vs-personal is per-page metadata,
 * with predecessor links joining rebuild pairs.
 */
export const ProjectOriginSchema = z.enum(["university", "personal"]);

export type ProjectOrigin = z.infer<typeof ProjectOriginSchema>;

/** Canonical project model. Keep parallel to EssaySchema, not abstracted. */
export const ProjectSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	date: z.coerce.date(),
	origin: ProjectOriginSchema,
	repo: z.string().url().optional(),
	stack: z.array(z.string()).default([]),
	predecessor: z.string().min(1).optional(),
	cover: z.string().min(1).optional(),
	coverAlt: z.string().optional(),
	featured: z.boolean().default(false),
	draft: z.boolean().default(false),
});

export type ProjectMeta = z.infer<typeof ProjectSchema>;

/**
 * Tolerates existing Hugo frontmatter on the way in.
 * New code must only consume ProjectMeta, never this.
 */
export const RawProjectFrontmatterSchema = z.object({
	title: z.string(),
	date: z.unknown(),
	description: z.string().optional(),
	featured: z.boolean().default(false),
	draft: z.boolean().default(false),
	origin: z.string().optional(),
	repo: z.string().optional(),
	// New stack field wins; Hugo tags are the legacy fallback.
	// Hugo `type: [projects, project]` is deliberately not mapped.
	stack: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	predecessor: z.string().optional(),
	cover: z.string().optional(),
	coverAlt: z.string().optional(),
	// Hugo legacy presentation metadata. Accepted but deliberately
	// discarded: never forwarded to ProjectMeta.
	author: z.unknown().optional(),
	toc: z.unknown().optional(),
	type: z.unknown().optional(),
	images: z.unknown().optional(),
});

export type RawProjectFrontmatter = z.infer<typeof RawProjectFrontmatterSchema>;

export function normalizeProjectFrontmatter(
	raw: z.input<typeof RawProjectFrontmatterSchema>,
): ProjectMeta {
	return ProjectSchema.parse({
		title: raw.title,
		description: raw.description,
		date: raw.date,
		origin: raw.origin ?? "personal",
		repo: raw.repo,
		stack: raw.stack ?? raw.tags ?? [],
		predecessor: raw.predecessor,
		cover: raw.cover,
		coverAlt: raw.coverAlt,
		featured: raw.featured ?? false,
		draft: raw.draft ?? false,
	});
}
