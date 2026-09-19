import { describe, expect, it } from "vitest";
import { pickFeatured } from "./content.js";

function item(slug: string, date: string, featured: boolean) {
	return { slug, date: new Date(date), featured };
}

function slugs(
	items: { slug: string; date: Date; featured: boolean }[],
	count?: number,
): string[] {
	return pickFeatured(items, count).map((i) => i.slug);
}

describe("pickFeatured flagged items", () => {
	it("puts a flagged item first and backfills with the newest", () => {
		const items = [
			item("new", "2021-06-01", false),
			item("middle", "2020-06-01", false),
			item("pick", "2020-01-01", true),
		];
		expect(slugs(items)).toEqual(["pick", "new"]);
	});

	it("orders several flagged items newest-first", () => {
		const items = [
			item("older-pick", "2020-01-01", true),
			item("newer-pick", "2020-06-01", true),
			item("newest", "2021-06-01", false),
		];
		expect(slugs(items)).toEqual(["newer-pick", "older-pick"]);
	});

	it("caps the row at the requested count", () => {
		const items = [
			item("a", "2020-01-01", true),
			item("b", "2020-02-01", true),
			item("c", "2020-03-01", true),
		];
		expect(slugs(items, 2)).toEqual(["c", "b"]);
		expect(slugs(items, 1)).toEqual(["c"]);
	});

	it("never repeats an item", () => {
		const items = [item("only", "2020-01-01", true)];
		expect(slugs(items)).toEqual(["only"]);
	});
});

describe("pickFeatured fallback", () => {
	it("returns an empty row when there is nothing to pick from", () => {
		expect(pickFeatured([])).toEqual([]);
	});

	it("falls back to the newest items when nothing is flagged", () => {
		const items = [
			item("old", "2020-01-01", false),
			item("new", "2021-06-01", false),
			item("middle", "2020-06-01", false),
		];
		expect(slugs(items)).toEqual(["new", "middle"]);
	});

	it("ignores input order", () => {
		const items = [
			item("newest", "2021-06-01", false),
			item("oldest", "2019-01-01", false),
			item("middle", "2020-01-01", false),
		];
		expect(slugs(items)).toEqual(["newest", "middle"]);
	});
});
