# TODO

## Projects to add

- [x] Tablescan — split into [Extracting PDF Tables](content/projects/extracting-pdf-tables.md) (the 2021 university engine) and [Tablescan](content/projects/tablescan.md) (the 2026 front end), linked as predecessor and follow-up. Both published.
- [x] AR telehealth HoloLens 2 proof of concept — published as [AR Telehealth with HoloLens 2](content/projects/ar-telehealth.md).
- [x] MediaStack — https://github.com/famesjranko/MediaStack (draft at `content/projects/mediastack.md`, needs review + cover art before publishing)
- [x] esp32-s3-internet-monitor — https://github.com/famesjranko/esp32-s3-internet-monitor (draft at `content/projects/esp32-s3-internet-monitor.md`, needs review + cover art before publishing)
- [x] minesweeper-flags — https://github.com/famesjranko/minesweeper-flags (draft at `content/projects/minesweeper-flags.md`, needs review + cover art before publishing)
- [x] object-tracking-demo — https://github.com/famesjranko/object-tracking-demo (draft at `content/projects/object-tracking-demo.md`, needs review + cover art before publishing)

## New categories

- [ ] Add a "Thoughts", "Ruminations", or similarly named page/category for notes, reflections, ideas, explorations, and suggestions that are neither project write-ups nor full essays. Decide on the name and how this content should live alongside essays and projects.
  - Revisit the paper in `refs/primary-papers/` about private and public spaces and the human soul: reflect on how those ideas look now in relation to work, politics, economics, and the self.
  - Consider placing ["Who are we as knowledge holders?"](content/essays/as-knowledge-holders.md) in this area.
- [ ] Add a way to mark "currently working on" content, separate from finished/stable `essays`/`projects`. Two approaches to weigh:
  - New top-level category + page (own content dir, e.g. `content/<name>/`), like `essays`/`projects`.
  - A meta/status tag (e.g. `status: active`) usable on any article in any category, with a generated listing page (e.g. "Active" page) that pulls tagged articles regardless of category. Cleaner — doesn't force duplicate content dirs, works across essays/projects/future categories.
  - Need a name either way — candidates: "in-progress", "underway", "wip", "in-flight", "ongoing", "active", "current", "now", "building", "in-the-works".
- [ ] Add 'About' page for a biography

## Light-mode SVG contrast

- [x] Fix SVGs with transparent backgrounds + light/muted colours tuned for dark mode — unreadable/low-contrast on a light background. No `<rect>` background fill in any of them, so they inherit the page background directly:
  - `static/img/essays/dretske-closure/euler-diagram.svg` — text fill `#dce5ea`
  - `static/img/projects/connect4-heuristic/connect4-depth1.svg` — `#c8d2d9` heading, `#8ba0ad` columns/score, `#496170`/`#688091` grid/frame strokes
  - `static/img/projects/connect4-heuristic/connect4-depth2.svg` (same palette)
  - `static/img/projects/connect4-heuristic/connect4-depth3.svg` (same palette)
  - `static/img/projects/connect4-heuristic/connect4-depth4.svg` (same palette)
  - Fix options: add explicit light/dark color variants (e.g. via `@media (prefers-color-scheme)` inside the SVG, or CSS custom properties), or give each an opaque background matching the dark theme so they render consistently regardless of page mode.
