# TODO

## Projects to add

- [x] MediaStack — https://github.com/famesjranko/MediaStack (draft at `content/projects/mediastack.md`, needs review + cover art before publishing)
- [x] esp32-s3-internet-monitor — https://github.com/famesjranko/esp32-s3-internet-monitor (draft at `content/projects/esp32-s3-internet-monitor.md`, needs review + cover art before publishing)
- [x] minesweeper-flags — https://github.com/famesjranko/minesweeper-flags (draft at `content/projects/minesweeper-flags.md`, needs review + cover art before publishing)
- [x] object-tracking-demo — https://github.com/famesjranko/object-tracking-demo (draft at `content/projects/object-tracking-demo.md`, needs review + cover art before publishing)

## New categories

- [ ] Add a way to mark "currently working on" content, separate from finished/stable `essays`/`projects`. Two approaches to weigh:
  - New top-level category + page (own content dir, e.g. `content/<name>/`), like `essays`/`projects`.
  - A meta/status tag (e.g. `status: active`) usable on any article in any category, with a generated listing page (e.g. "Active" page) that pulls tagged articles regardless of category. Cleaner — doesn't force duplicate content dirs, works across essays/projects/future categories.
  - Need a name either way — candidates: "in-progress", "underway", "wip", "in-flight", "ongoing", "active", "current", "now", "building", "in-the-works".
- [ ] Add 'About' page for a biography

## Light-mode SVG contrast

- [ ] Fix SVGs with transparent backgrounds + light/muted colours tuned for dark mode — unreadable/low-contrast on a light background. No `<rect>` background fill in any of them, so they inherit the page background directly:
  - `static/img/essays/dretske-closure/euler-diagram.svg` — text fill `#dce5ea`
  - `static/img/projects/connect4-heuristic/connect4-depth1.svg` — `#c8d2d9` heading, `#8ba0ad` columns/score, `#496170`/`#688091` grid/frame strokes
  - `static/img/projects/connect4-heuristic/connect4-depth2.svg` (same palette)
  - `static/img/projects/connect4-heuristic/connect4-depth3.svg` (same palette)
  - `static/img/projects/connect4-heuristic/connect4-depth4.svg` (same palette)
  - Fix options: add explicit light/dark color variants (e.g. via `@media (prefers-color-scheme)` inside the SVG, or CSS custom properties), or give each an opaque background matching the dark theme so they render consistently regardless of page mode.
