import { type Essay, writingPath } from "../content.js";
import { siteUrl } from "../site.js";
import { cardCover, escapeHtml, page, topicLink } from "./layout.js";

/** Notes on the homepage: two rows of two blocks. */
export const RECENT_NOTES_COUNT = 4;

/**
 * The row image takes 35% of the content width (68rem at most) beside
 * the text, and the full width once the row stacks below 42rem.
 */
const NOTE_IMAGE_SIZES =
	"(min-width: 73rem) 23.8rem, (min-width: 42rem) calc(35vw - 1.75rem), (min-width: 25rem) 92vw, calc(100vw - 2rem)";

/** Notes are dated by year only; the UTC year matches the frontmatter date. */
function noteMeta(note: Essay): string {
	return `<p class="note-meta">${note.date.getUTCFullYear()} · ${note.readingMinutes} min</p>`;
}

function noteTitle(note: Essay, heading: 2 | 3): string {
	const url = siteUrl(writingPath(note));
	return `<h${heading} class="note-title"><a href="${url}">${escapeHtml(note.title)}</a></h${heading}>`;
}

function noteDescription(note: Essay): string {
	return note.description === undefined
		? ""
		: `<p class="note-desc">${escapeHtml(note.description)}</p>`;
}

/** A ruled row: text on the left, the cover on the right. */
export function noteRow(note: Essay): string {
	const topics = note.topics.map((topic) => topicLink(topic)).join("");
	const draft = note.draft ? " note-row-draft" : "";
	return `<li class="note-row${draft}">
<div class="note-text">
${noteMeta(note)}
${noteTitle(note, 2)}
${noteDescription(note)}
<p class="entry-meta"><span class="entry-topics">${topics}</span></p>
</div>
${cardCover(note, NOTE_IMAGE_SIZES)}
</li>`;
}

/** A homepage block: text only, so the section stays lighter than the cards. */
export function noteBlock(note: Essay): string {
	return `<li class="note-block">
${noteMeta(note)}
${noteTitle(note, 3)}
${noteDescription(note)}
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

/** The newest notes for the homepage; no notes means no section. */
export function recentNotesSection(notes: Essay[]): string {
	if (notes.length === 0) {
		return "";
	}
	const blocks = [...notes]
		.sort((a, b) => b.date.getTime() - a.date.getTime())
		.slice(0, RECENT_NOTES_COUNT)
		.map(noteBlock)
		.join("\n");
	return `<section id="recent-notes" class="wrap recent" aria-labelledby="recent-notes-heading">
<h2 id="recent-notes-heading">Recent notes</h2>
<ol class="note-blocks">${blocks}</ol>
<p class="more-link"><a href="${siteUrl("/notes/")}">More notes</a></p>
</section>`;
}
