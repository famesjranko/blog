import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { articleMeta } from "./articleMeta.js";
import { escapeHtml, page } from "./layout.js";

export interface PrototypeOption {
	id: "restrained" | "book" | "folio" | "inset";
	name: string;
	description: string;
}

const RESTRAINED: PrototypeOption = {
	id: "restrained",
	name: "Restrained baseline",
	description: "Normal prose rhythm with only the clearest passage emphasised.",
};

const EMPEROR_OPENINGS: PrototypeOption[] = [
	{
		id: "book",
		name: "Book-style narrative",
		description:
			"A slightly narrower measure and paragraph indent change the reading mode without decoration.",
	},
	{
		id: "folio",
		name: "Folio rules",
		description:
			"Two quiet hairlines delimit the complete folktale before the analysis begins.",
	},
	{
		id: "inset",
		name: "Quiet narrative inset",
		description:
			"A small alignment shift presents the opening as a tale nested inside the analysis.",
	},
];

export function optionsForNote(note: Essay): PrototypeOption[] {
	return note.slug === "emperors-new-clothes"
		? [RESTRAINED, ...EMPEROR_OPENINGS]
		: [RESTRAINED];
}

function optionUrl(note: Essay, option: PrototypeOption): string {
	return siteUrl(`/prototypes/notes/${note.slug}/${option.id}/`);
}

function optionNav(note: Essay, selected: PrototypeOption): string {
	const links = optionsForNote(note)
		.map((option) => {
			const current = option.id === selected.id ? ' aria-current="page"' : "";
			return `<a href="${optionUrl(note, option)}"${current}>${escapeHtml(option.name)}</a>`;
		})
		.join("");
	return `<aside class="prototype-toolbar" aria-label="Prototype controls">
<a class="prototype-back" href="${siteUrl("/prototypes/notes/")}">All notes</a>
<nav aria-label="Formatting options">${links}</nav>
<p><strong>${escapeHtml(selected.name)}</strong> — ${escapeHtml(selected.description)}</p>
</aside>`;
}

function withoutSections(html: string): string {
	return html
		.replaceAll('<div class="note-section">', "")
		.replaceAll("</div>", "");
}

function peepQuote(html: string): string {
	return html.replace(
		'<span class="note-embedded-quote">the “fundamental hostility to any other consciousness is found in consciousness itself.”</span>',
		'the <span class="note-source-quote">“fundamental hostility to any other consciousness is found in consciousness itself.”</span>',
	);
}

function peepPov(html: string): string {
	return html.replace(
		"we see what they see; we hear what they think.</p>",
		'<span class="peep-pov"><span>we see what they see;</span> <span>we hear what they think.</span></span></p>',
	);
}

function restrainedBody(note: Essay): string {
	const body = withoutSections(note.html);
	if (note.slug === "emperors-new-clothes") {
		return body.replace(
			"“the emperor is wearing nothing at all!”",
			'<span class="note-revelation">“the emperor is wearing nothing at all!”</span>',
		);
	}
	return note.slug === "peep-show" ? peepPov(peepQuote(body)) : body;
}

function emperorOpening(note: Essay, option: PrototypeOption): string {
	const marker = '<div class="note-section">';
	const boundary = note.html.indexOf(marker);
	if (boundary < 0) {
		return withoutSections(note.html);
	}
	const opening = note.html.slice(0, boundary);
	const analysis = withoutSections(note.html.slice(boundary + marker.length));
	return `<div class="note-tale note-tale-${option.id}">${opening}</div>\n${analysis}`;
}

function articleBody(note: Essay, option: PrototypeOption): string {
	return note.slug === "emperors-new-clothes" && option.id !== "restrained"
		? emperorOpening(note, option)
		: restrainedBody(note);
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
	const options = optionsForNote(note)
		.map(
			(option) =>
				`<li><a href="${optionUrl(note, option)}"><strong>${escapeHtml(option.name)}</strong><span>${escapeHtml(option.description)}</span></a></li>`,
		)
		.join("");
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
		content: `<div class="wrap prototype-index"><header><p class="prototype-kicker">Local review</p><h1>Restrained note formats</h1><p>The restrained treatment is now the shared baseline. Only the folktale opening in <em>On The Emperor’s New Clothes</em> remains under review.</p></header>${notes.map(noteRow).join("")}</div>`,
	});
}
