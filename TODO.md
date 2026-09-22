# TODO

## Projects to add

- [ ] Finalise [Tablescan](content/projects/tablescan.md) using its [current repository](https://github.com/famesjranko/tablescan) and the [earlier PDF extraction API repository](https://github.com/famesjranko/automated-PDF-tabulated-data-extractor-api). Explain the progression from the university team capstone through the later personal republication of its code to the Tablescan rewrite, with attribution and features checked against each version.
  - Consider following the [Connect-4 heuristic](content/projects/connect4-heuristic.md) and [Connect-4 web interface](content/projects/connect4-lisp-web.md) pattern: one article about the university capstone and a separate Tablescan article linked to it as its predecessor. Check whether the capstone work has enough distinct evidence and story for its own page.
- [ ] AR telehealth HoloLens 2 proof of concept — write a project article about the Cisco, La Trobe University, and Northern Health collaboration. The enterprise code is unavailable; use the existing notes in [`ar-telehealth-hololens.md`](refs/primary-papers/ar-telehealth-hololens.md) and [`ar-telehealth-hololens-origin.md`](refs/primary-papers/ar-telehealth-hololens-origin.md) to explain the problem, Andrew's contribution, the technical approach, and the demonstrated POC. Keep the distinction between a prototype and clinical deployment clear.
  - Public sources: [Innovation Central Melbourne overview](https://icentralau.com.au/melbourne/cisco-innovation-central-melbourne-explores-use-of-ar-technology-to-virtually-bring-doctors-into-aged-care-homes/), [La Trobe University release](https://www.latrobe.edu.au/news/articles/2023/release/virtual-emergency-departments-to-nursing-homes), [Innovation Central Melbourne case study](https://icentralau.com.au/melbourne/case-studies/cisco-innovation-central-melbourne-join-forces-with-northern-health-in-a-pioneering-partnership-to-redefine-telehealth/), and [Cisco blog post with a video featuring Andrew](https://blogs.cisco.com/education/three-students-from-australias-la-trobe-university-were-given-the-academic-and-industry-support-a-tight-timeframe-and-a-supervisor-to-come-up-with-a-digital-solution-for-our-health-sector).
  - Video: Prefer embedding [Cisco's hosted video](https://video.cisco.com/detail/video/6308004121112) in the article if Cisco permits it and playback works on the site; include a direct link as a fallback. A local copy, [`A university a network and three brilliant students - Cisco Video Portal.mp4`](refs/primary-papers/A%20university%20a%20network%20and%20three%20brilliant%20students%20-%20Cisco%20Video%20Portal.mp4) (about 35 MB), is available for reference. Confirm reuse rights before considering self-hosting it.
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
