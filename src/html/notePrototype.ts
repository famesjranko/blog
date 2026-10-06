import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { articleMeta } from "./articleMeta.js";
import { escapeHtml, page } from "./layout.js";

export interface PrototypeOption {
	id: "a" | "b" | "c" | "d";
	name: string;
	description: string;
}

export const PROTOTYPE_OPTIONS: PrototypeOption[] = [
	{
		id: "a",
		name: "Quiet chapters",
		description:
			"Whitespace and a small section mark identify real changes of thought.",
	},
	{
		id: "b",
		name: "Editorial fields",
		description:
			"Soft panels group the article's major movements without treating them as quotations.",
	},
	{
		id: "c",
		name: "Key passages",
		description:
			"The prose stays open while one pivotal passage carries the visual emphasis.",
	},
	{
		id: "d",
		name: "Bespoke",
		description:
			"Each note gets a treatment derived from its own story or argument.",
	},
];

function optionUrl(note: Essay, option: PrototypeOption): string {
	return siteUrl(`/prototypes/notes/${note.slug}/${option.id}/`);
}

function optionNav(note: Essay, selected: PrototypeOption): string {
	const links = PROTOTYPE_OPTIONS.map((option) => {
		const current = option.id === selected.id ? ' aria-current="page"' : "";
		return `<a href="${optionUrl(note, option)}"${current}>${option.id.toUpperCase()}. ${escapeHtml(option.name)}</a>`;
	}).join("");
	return `<aside class="prototype-toolbar" aria-label="Prototype controls">
<a class="prototype-back" href="${siteUrl("/prototypes/notes/")}">All notes</a>
<nav aria-label="Formatting options">${links}</nav>
<p><strong>${selected.id.toUpperCase()}. ${escapeHtml(selected.name)}</strong> — ${escapeHtml(selected.description)}</p>
</aside>`;
}

function bespokeBody(note: Essay): string {
	if (note.slug === "emperors-new-clothes") {
		return note.html.replaceAll(
			"“the emperor is wearing nothing at all!”",
			'<span class="prototype-refrain">“the emperor is wearing nothing at all!”</span>',
		);
	}
	if (note.slug !== "historical-retort") {
		return note.html;
	}
	return note.html
		.replace(
			"<p>A world of only private reason",
			'<div class="prototype-contrast"><p>A world of only private reason',
		)
		.replace("ideals. Whereas a world", "ideals.</p>\n<p>Whereas a world")
		.replace("ideals. A world", "ideals.</p>\n<p>A world")
		.replace("uninteresting; whereas", "uninteresting;</p>\n<p>whereas")
		.replace(
			"interesting. It is by",
			'interesting.</p>\n</div>\n<p class="prototype-thesis">It is by',
		);
}

function articleBody(note: Essay, option: PrototypeOption): string {
	return option.id === "d" ? bespokeBody(note) : note.html;
}

export function notePrototypePage(
	note: Essay,
	option: PrototypeOption,
): string {
	const meta = articleMeta({
		label: "Note",
		date: note.date,
		readingMinutes: note.readingMinutes,
		draft: false,
	});
	const subtitle =
		note.description === undefined
			? ""
			: `<p>${escapeHtml(note.description)}</p>`;
	return page({
		title: `${note.title} — ${option.name}`,
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/prose.css"),
			siteUrl("/css/essay.css"),
			siteUrl("/css/notes.css"),
			siteUrl("/prototypes/notes/styles.css"),
		],
		content: `${optionNav(note, option)}<div class="wrap"><article class="prose essay note prototype-note prototype-${note.slug} prototype-${option.id}">
<header>${meta}<h1>${escapeHtml(note.title)}</h1>${subtitle}</header>
${articleBody(note, option)}
</article></div>`,
	});
}

function noteRow(note: Essay): string {
	const options = PROTOTYPE_OPTIONS.map(
		(option) =>
			`<li><a href="${optionUrl(note, option)}"><strong>${option.id.toUpperCase()}. ${escapeHtml(option.name)}</strong><span>${escapeHtml(option.description)}</span></a></li>`,
	).join("");
	return `<section class="prototype-note-row"><h2>${escapeHtml(note.title)}</h2><ol>${options}</ol></section>`;
}

export function notePrototypeIndex(notes: Essay[]): string {
	return page({
		title: "Note formatting prototypes",
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/prototypes/notes/styles.css"),
		],
		content: `<div class="wrap prototype-index"><header><p class="prototype-kicker">Local review</p><h1>Note formatting prototypes</h1><p>Four treatments for each note. The published note pages are unchanged.</p></header>${notes.map(noteRow).join("")}</div>`,
	});
}
