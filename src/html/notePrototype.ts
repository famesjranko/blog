import type { Essay } from "../content.js";
import { siteUrl } from "../site.js";
import { articleMeta } from "./articleMeta.js";
import { escapeHtml, page } from "./layout.js";

export interface PrototypeOption {
	id: "recommended" | "restrained";
	name: string;
	description: string;
}

export const PROTOTYPE_OPTIONS: PrototypeOption[] = [
	{
		id: "recommended",
		name: "Content-led recommendation",
		description:
			"One treatment derived from this note's own argument and form.",
	},
	{
		id: "restrained",
		name: "Restrained fallback",
		description:
			"Normal prose rhythm with only the clearest passage emphasised.",
	},
];

const RECOMMENDATIONS: Record<string, string> = {
	"emperors-new-clothes":
		"A folktale opening, an inline revelation, and quiet typographic turns into theory and application.",
	"historical-retort":
		"One open public/private comparison at the climax; the medicine analogy remains prose.",
	"i-heart-huckabees":
		"The rehearsed Shania story is framed; Brad's final admission is left exposed.",
	"peep-show":
		"A two-perspective motif connects the camera premise to conflict and reciprocity.",
};

function optionUrl(note: Essay, option: PrototypeOption): string {
	return siteUrl(`/prototypes/notes/${note.slug}/${option.id}/`);
}

function optionDescription(note: Essay, option: PrototypeOption): string {
	return option.id === "recommended"
		? (RECOMMENDATIONS[note.slug] ?? option.description)
		: option.description;
}

function optionNav(note: Essay, selected: PrototypeOption): string {
	const links = PROTOTYPE_OPTIONS.map((option) => {
		const current = option.id === selected.id ? ' aria-current="page"' : "";
		return `<a href="${optionUrl(note, option)}"${current}>${escapeHtml(option.name)}</a>`;
	}).join("");
	return `<aside class="prototype-toolbar" aria-label="Prototype controls">
<a class="prototype-back" href="${siteUrl("/prototypes/notes/")}">All notes</a>
<nav aria-label="Formatting options">${links}</nav>
<p><strong>${escapeHtml(selected.name)}</strong> — ${escapeHtml(optionDescription(note, selected))}</p>
</aside>`;
}

function withoutSections(html: string): string {
	return html
		.replaceAll('<div class="note-section">', "")
		.replaceAll("</div>", "");
}

function emperorBody(html: string): string {
	return `<div class="note-tale">${html}`
		.replace('<div class="note-section">', '</div>\n<div class="note-theory">')
		.replace('<div class="note-section">', '<div class="note-application">')
		.replace(
			"“the emperor is wearing nothing at all!”",
			'<span class="note-revelation">“the emperor is wearing nothing at all!”</span>',
		)
		.replace(
			"<p>The above sentence has quite a few terms",
			'<p class="note-aside">The above sentence has quite a few terms',
		)
		.replace(
			"<p>On face value this might appear",
			'<p class="note-hinge">On face value this might appear',
		);
}

function historicalBody(html: string): string {
	return withoutSections(html)
		.replace(
			"<p>A world of only private reason",
			'<div class="note-reason-contrast"><div class="note-reason-worlds"><p>A world of only private reason',
		)
		.replace("ideals. Whereas a world", "ideals.</p>\n<p>Whereas a world")
		.replace(
			"ideals. A world",
			'ideals.</p>\n</div>\n<p class="note-reason-summary">A world',
		)
		.replace(
			"interesting. It is by",
			'interesting.</p>\n</div>\n<p class="note-reason-conclusion">It is by',
		);
}

function huckabeesBody(html: string): string {
	return withoutSections(html)
		.replace("note-feature-quote", "note-performance-quote")
		.replace(
			"states: “I don’t have a job.",
			'states:</p>\n<blockquote class="note-collapse-quote"><p>“I don’t have a job.',
		)
		.replace(
			"I don’t even know who I am.” It is in",
			"I don’t even know who I am.”</p></blockquote>\n<p>It is in",
		);
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
		'<span class="peep-pair peep-pair-pov"><span>we see what they see;</span>\n<span>we hear what they think.</span></span></p>',
	);
}

function peepBody(html: string): string {
	return peepPov(peepQuote(withoutSections(html)))
		.replace(
			"reciprocity (De Beauvoir). Conflict in",
			'reciprocity (De Beauvoir).</p>\n<span class="peep-pair peep-pair-relation"><span><strong>Conflict</strong> in',
		)
		.replace(
			"mutual recognition of their brotherhood.</p>",
			"mutual recognition of their brotherhood.</span></span>",
		);
}

function recommendedBody(note: Essay): string {
	const renderers: Record<string, (html: string) => string> = {
		"emperors-new-clothes": emperorBody,
		"historical-retort": historicalBody,
		"i-heart-huckabees": huckabeesBody,
		"peep-show": peepBody,
	};
	return (renderers[note.slug] ?? withoutSections)(note.html);
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

function articleBody(note: Essay, option: PrototypeOption): string {
	return option.id === "recommended"
		? recommendedBody(note)
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
	const options = PROTOTYPE_OPTIONS.map(
		(option) =>
			`<li><a href="${optionUrl(note, option)}"><strong>${escapeHtml(option.name)}</strong><span>${escapeHtml(optionDescription(note, option))}</span></a></li>`,
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
		content: `<div class="wrap prototype-index"><header><p class="prototype-kicker">Local review</p><h1>Content-led note formats</h1><p>One close-reading recommendation and one restrained fallback for each note. The published note pages are unchanged.</p></header>${notes.map(noteRow).join("")}</div>`,
	});
}
