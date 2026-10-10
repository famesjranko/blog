# Visual style

This site is for reading essays and exploring projects. Keep the page quiet so
the text and images have priority. Use space, type, and clear alignment to show
structure. Avoid decoration that competes with the content.

This document records visual intent. The stylesheets define the current values.
For visual changes, use the evidence in the [PR template](.github/pull_request_template.md)
and ask for explicit visual review.

## Reading and type

Keep essay text at a comfortable reading measure with generous line spacing.
The current prose measure is font relative (`65ch`), so it follows the glyph
widths of the reading font. A font-relative measure must not be replaced with a
fixed measure based on one platform without cross-platform evidence. Georgia
and its fallbacks can produce different line lengths on Windows, Linux, and
other systems. A desktop width that looks acceptable on one system can make an
essay much narrower on another.

Review an essay with long paragraphs on more than one platform when changing
fonts or measure. Compare the rendered text width and line breaks. If a change
alters the page length substantially, explain why the new measure serves
reading better.

## Space, figures, and cards

Keep the main content centred with side gutters that remain visible on narrow
screens. Prose has a narrower measure than the general content area. Keep
article images and diagrams within that measure and aligned with their text.
Preserve each image's proportions. Keep captions attached to their figures.

Cards use a single column on narrow screens and a balanced grid where there is
room. Keep their images, titles, and metadata legible without overlap or
horizontal page scrolling. Check a narrow and a wide viewport when changing
gutters, image sizing, cards, or breakpoints. At a narrow width, the content
must have breathing room on both sides. At a wide width, columns must not look
crowded or leave an unintended gap.

## Cover images

A cover appears in three views. Compose every cover so that all of them work.

| View | Shape | Crop |
| --- | --- | --- |
| Article page | The image's own shape | None |
| Index cards and homepage picks | 16:9 | Keeps the centre (`.card-media` in `styles/main.css`, `.home-pick-media` in `styles/home.css`) |
| Homepage showcase | 2.4:1 | Keeps the centre (`.showcase-media` in `styles/home.css`) |

Use the wide banner shape of the existing covers, 2.4:1 (for example
1512×630). The showcase then shows the whole image, and the 16:9 views keep
only the central 74% of its width. Put the whole subject inside the central
70%, and fill the outer edges with background that a card can cut away.

A cover with a different shape loses content in the showcase. A 16:9 cover
loses about 13% of its height at the top and at the bottom. A cover wider than
2.4:1 loses its sides. A 16:9 cover fits the cards without loss, but its
article hero is taller than the others.

Any `featured: true` piece can become the showcase. Without a
`showcase: true` flag, the newest featured piece takes it. So give every
featured or showcase piece a real 2.4:1 cover, at least 1280 pixels wide. The
generated placeholder (640×360) is too small and the wrong shape for the
showcase.

The card-safe margins can make the subject look small on the article page. In
that case, keep the margin version as `cover` and point the article's first
image at a tighter crop of the same picture.

Before you add a cover, or set `featured` or `showcase` on a piece, check its
crop on the homepage and on the index page. Write `coverAlt` for the whole
image.

## Colour and interaction

Light and dark themes must keep text, links, controls, borders, and diagrams
clear against their backgrounds. The hero stays dark in either page theme.
Check both themes when changing a colour or a themed asset. Review text and
non-text contrast where their colours change.

Keyboard focus must remain visible on links and controls, including cards and
header controls. Hover effects must not carry information that touch or
keyboard users need. Motion may add atmosphere or feedback, but it must not
block reading or interaction. Check the reduced-motion setting whenever an
animation or transition changes.

## Visual sign-off

Request explicit visual sign-off for changes to fonts, prose measure, gutters,
breakpoints, cards, images, theme colours, focus states, or motion. Check the
affected routes on the PR's Cloudflare preview at narrow/mobile and wide/desktop
widths, and in both themes for colour or theming changes. Record what you
checked in the PR. Screenshots are optional. State any intentional departure
from this document in the PR so a reviewer can judge it in context.
