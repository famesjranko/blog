import { type Essay, writingPath } from "../content.js";
import { siteUrl } from "../site.js";
import { cardCover, escapeHtml, page, topicLink } from "./layout.js";
import { titleHtml } from "./titleText.js";

/**
 * The row image takes 35% of the content width (68rem at most) beside
 * the text, and the full width once the row stacks below 42rem.
 */
const NOTE_IMAGE_SIZES =
	"(min-width: 73rem) 23.8rem, (min-width: 42rem) calc(35vw - 1.75rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";

function noteTitle(note: Essay): string {
	const url = siteUrl(writingPath(note));
	return `<h2 class="note-title"><a href="${url}">${titleHtml(note.title)}</a></h2>`;
}

function noteDescription(note: Essay): string {
	return note.description === undefined
		? ""
		: `<p class="note-desc">${escapeHtml(note.description)}</p>`;
}

function noteCover(note: Essay): string {
	const url = siteUrl(writingPath(note));
	const label = `Read ${note.title}`;
	return `<a class="note-cover-link" href="${url}" aria-label="${escapeHtml(label)}">${cardCover(note, NOTE_IMAGE_SIZES)}</a>`;
}

/** A ruled row: text on the left, the cover on the right. */
export function noteRow(note: Essay): string {
	const topics = note.topics.map((topic) => topicLink(topic)).join("");
	const draft = note.draft ? " note-row-draft" : "";
	return `<li class="note-row${draft}">
<div class="note-text">
${noteTitle(note)}
${noteDescription(note)}
<p class="entry-meta"><span class="entry-topics">${topics}</span></p>
</div>
${noteCover(note)}
</li>`;
}

export function noteIndexPage(notes: Essay[]): string {
	const rows = notes.map(noteRow).join("\n");
	const count = notes.length === 1 ? "1 note" : `${notes.length} notes`;
	return page({
		title: "Notes",
		canonicalPath: "/notes/",
		description: "Shorter pieces on philosophy, film, and stories.",
		styles: [
			siteUrl("/css/main.css"),
			siteUrl("/css/header.css"),
			siteUrl("/css/notes.css"),
		],
		content: `<div class="wrap index-page"><h1>Notes</h1><p class="index-count">${count}</p><ol class="note-rows">${rows}</ol></div>`,
	});
}
