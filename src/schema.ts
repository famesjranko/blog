import { z } from "zod";

/** Canonical content model. This is the typed API Hugo never gave you. */
export const EssaySchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	date: z.coerce.date(),
	topics: z.array(z.string()).default([]),
	philosophers: z.array(z.string()).default([]),
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
	draft: z.boolean().default(false),
	// Hugo legacy
	tags: z.array(z.string()).optional(),
	categories: z.array(z.string()).optional(),
	// New fields
	topics: z.array(z.string()).optional(),
	philosophers: z.array(z.string()).optional(),
});

export type RawFrontmatter = z.infer<typeof RawFrontmatterSchema>;

export function normalizeFrontmatter(raw: RawFrontmatter): EssayMeta {
	return EssaySchema.parse({
		title: raw.title,
		description: raw.description,
		date: raw.date,
		topics: raw.topics ?? raw.tags ?? raw.categories ?? [],
		philosophers: raw.philosophers ?? [],
		draft: raw.draft ?? false,
	});
}
