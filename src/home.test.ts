import { describe, expect, it } from "vitest";
import type { Essay, Project } from "./content.js";
import {
	type HomeEntry,
	LATEST_COUNT,
	PICK_COUNT,
	homeEntries,
	pickShowcase,
	selectHome,
} from "./home.js";

function entry(overrides: Partial<HomeEntry> & { slug: string }): HomeEntry {
	return {
		section: "essays",
		path: `/essays/${overrides.slug}/`,
		title: overrides.slug,
		date: new Date("2020-01-01T00:00:00Z"),
		featured: false,
		showcase: false,
		draft: false,
		...overrides,
	};
}

function slugs(entries: HomeEntry[]): string[] {
	return entries.map((e) => e.slug);
}

describe("pickShowcase flag", () => {
	it("uses the flagged piece over a newer featured piece", () => {
		// Given a flagged older essay and a newer featured project.
		const entries = [
			entry({ slug: "flagged", showcase: true }),
			entry({
				slug: "newer",
				section: "projects",
				featured: true,
				date: new Date("2026-01-01T00:00:00Z"),
			}),
		];

		// When the showcase is picked.
		const showcase = pickShowcase(entries);

		// Then the flagged essay is the showcase.
		expect(showcase?.slug).toBe("flagged");
	});

	it("rejects a second flagged piece and names both", () => {
		// Given two pieces that both set showcase: true.
		const entries = [
			entry({ slug: "a", title: "First", showcase: true }),
			entry({ slug: "b", title: "Second", showcase: true }),
		];

		// When the showcase is picked.
		const pick = () => pickShowcase(entries);

		// Then the build fails and names both pieces.
		expect(pick).toThrow(
			'only one piece may set showcase: true; found "First", "Second"',
		);
	});
});

describe("pickShowcase fallback", () => {
	it("falls back to the newest featured piece in any section", () => {
		// Given no flag, a featured note, and a newer unfeatured essay.
		const entries = [
			entry({ slug: "note", section: "notes", featured: true }),
			entry({ slug: "newest", date: new Date("2026-01-01T00:00:00Z") }),
		];

		// When the showcase is picked.
		const showcase = pickShowcase(entries);

		// Then the featured note is the showcase.
		expect(showcase?.slug).toBe("note");
	});

	it("falls back to the newest piece when nothing is featured", () => {
		// Given two unfeatured pieces.
		const entries = [
			entry({ slug: "old" }),
			entry({ slug: "new", date: new Date("2021-01-01T00:00:00Z") }),
		];

		// When the showcase is picked.
		const showcase = pickShowcase(entries);

		// Then the newest piece is the showcase.
		expect(showcase?.slug).toBe("new");
	});
});

describe("selectHome picks", () => {
	it("picks one piece per section, the showcase's section included", () => {
		// Given a project showcase and two pieces in each section.
		const entries = [
			entry({ slug: "note-a", section: "notes" }),
			entry({ slug: "note-b", section: "notes", featured: true }),
			entry({ slug: "show", section: "projects", showcase: true }),
			entry({ slug: "project-b", section: "projects", featured: true }),
			entry({ slug: "essay-a", featured: true }),
			entry({ slug: "essay-b" }),
		];

		// When the homepage selection is made.
		const { picks } = selectHome(entries);

		// Then each section's featured piece comes first, in section order.
		expect(slugs(picks).slice(0, 3)).toEqual([
			"essay-a",
			"project-b",
			"note-b",
		]);
		// And the showcase is never also a pick.
		expect(slugs(picks)).not.toContain("show");
	});

	it("shows fewer picks only when there are not enough pieces", () => {
		// Given a showcase and two other pieces.
		const entries = [
			entry({ slug: "show", showcase: true }),
			entry({ slug: "a" }),
			entry({ slug: "b", section: "notes" }),
		];

		// When the homepage selection is made.
		const { picks } = selectHome(entries);

		// Then both other pieces are picked once each.
		expect(slugs(picks).sort()).toEqual(["a", "b"]);
	});
});

describe("selectHome backfill", () => {
	it("fills the slot of a section that has nothing left", () => {
		// Given the only project is the showcase.
		const entries = [
			entry({ slug: "show", section: "projects", showcase: true }),
			entry({ slug: "essay-new", date: new Date("2021-01-01Z") }),
			entry({ slug: "essay-flagged", featured: true }),
			entry({
				slug: "essay-old-flagged",
				featured: true,
				date: new Date("2010-01-01Z"),
			}),
			entry({ slug: "note", section: "notes" }),
		];

		// When the homepage selection is made.
		const { picks } = selectHome(entries);

		// Then the row still has every slot.
		expect(picks).toHaveLength(PICK_COUNT);
		// And the backfill puts an older featured piece before a newer one.
		expect(slugs(picks)).toEqual([
			"essay-flagged",
			"note",
			"essay-old-flagged",
			"essay-new",
		]);
	});

	it("selects nothing when there is no content", () => {
		// Given no pieces at all.
		const entries: HomeEntry[] = [];

		// When the homepage selection is made.
		const selection = selectHome(entries);

		// Then there is no showcase, no pick, and no Latest.
		expect(selection).toEqual({ showcase: undefined, picks: [], latest: [] });
	});
});

describe("selectHome latest", () => {
	const featured = [
		entry({ slug: "show", section: "projects", showcase: true }),
		entry({ slug: "essay", featured: true }),
		entry({ slug: "note", section: "notes" }),
	];
	// Ten projects: two fill pick slots, six fill Latest, two are left over.
	const rest = Array.from({ length: 10 }, (_, i) =>
		entry({
			slug: `p${i}`,
			section: "projects",
			date: new Date(Date.UTC(2010, i, 1)),
		}),
	);

	it("leaves out Featured pieces and keeps the newest", () => {
		// Given three Featured pieces and more other pieces than Latest holds.
		const entries = [...featured, ...rest];

		// When the homepage selection is made with skipping on.
		const { latest } = selectHome(entries, true);

		// Then Latest skips the projects picked into p9 and p8's slots.
		expect(slugs(latest)).toEqual(["p7", "p6", "p5", "p4", "p3", "p2"]);
	});

	it("keeps Featured pieces when skipping is off", () => {
		// Given Featured pieces newer than every other piece.
		const entries = [
			...featured.map((e) => ({ ...e, date: new Date("2030-01-01Z") })),
			...rest,
		];

		// When the homepage selection is made with skipping off.
		const { latest } = selectHome(entries, false);

		// Then Latest starts with the Featured pieces.
		expect(slugs(latest).slice(0, 3).sort()).toEqual(["essay", "note", "show"]);
		// And it still holds only the newest pieces.
		expect(latest).toHaveLength(LATEST_COUNT);
	});
});

describe("homeEntries", () => {
	it("gives each section's pieces its own URL path", () => {
		// Given one essay, one note, and one project.
		const base = { featured: false, showcase: false, draft: false };
		const piece = { html: "", readingMinutes: 1, images: [], sourcePath: "" };
		const writing = { topics: [], philosophers: [], ...base, ...piece };
		const content = {
			essays: [
				{
					...writing,
					section: "essays",
					slug: "e",
					title: "E",
					date: new Date(),
				},
			] satisfies Essay[],
			notes: [
				{
					...writing,
					section: "notes",
					slug: "n",
					title: "N",
					date: new Date(),
				},
			] satisfies Essay[],
			projects: [
				{
					...base,
					...piece,
					slug: "p",
					title: "P",
					date: new Date(),
					origin: "personal",
					stack: [],
				},
			] satisfies Project[],
		};

		// When they become homepage entries.
		const entries = homeEntries(content);

		// Then each links to its own section's page.
		expect(entries.map((e) => [e.section, e.path])).toEqual([
			["essays", "/essays/e/"],
			["projects", "/projects/p/"],
			["notes", "/notes/n/"],
		]);
	});
});
