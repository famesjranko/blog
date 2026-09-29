# Worked examples

Each example names the question, the methods in the order used, what decided the answer, and the traps met. They come from this blog, in Brave on Debian 13 with KDE Plasma on Wayland and a hybrid Intel and NVIDIA GPU.

## Element flashes white on reload

Question: a WebGL canvas in the hero showed solid white for 1 to 2 frames on about 1 in 3 reloads, in Chromium browsers only.

- Headless screencast: every frame dark. The effect was in presentation, not in paint.
- Human A/B variants: JavaScript off, reduced motion, and a build without the field were clean. That isolated the canvas. Several 3-try answers were false negatives.
- Engine attribution: Brave and Konqueror (QtWebEngine) flashed, Firefox did not. X11 also flashed, so the Wayland backend was not the cause.
- Browser stderr: a GPU error about a missing texture appeared on the loads that flashed.
- Screen recording decided it. The bad frame showed white exactly over the canvas, between the old page's frame and the new page's frame. So the outgoing page was redrawn after its canvas texture was freed.
- Fix: hide the canvas when navigation starts (`beforeunload`; `pagehide` is too late), show it again on `pageshow` and after a grace timer, in Chromium only.
- Measured: control about 10 flashes per 30 reloads; fix 0 in 190 across two versions. The fix held at 30 to 150 ms of delay and could fail at 0 ms.
- Side effects: perf A/B medians equal; Back/Forward restore checked, and the check failed when the `pageshow` line was removed.

## Whole page white before first paint

Question: a first visit showed the whole viewport white for 2 to 3 frames before the dark page painted.

- It first appeared as unexpected events in a recording made for the previous example. Frame inspection showed a different kind of event.
- Cold loads with `rec.sh -C`: rare and drifting (0 to 24 per 30).
- A 300 ms CSS delay made it occur on every cold load, about 16 frames long.
- Frame inspection split it: one frame while the tab title was the URL (the browser's), then frames with the page's title (the page's).
- Cause: `color-scheme` was declared only in the stylesheet. Fix: a static `<meta name="color-scheme" content="light dark">`, and an inline script that inserts a meta for a stored theme ahead of it.
- Traps: an edit to the meta's content had no effect before first paint; a white `data:` start page masked the effect for the control too.
- Measured: control white on 10 of 10 cold loads; fix only the 1-frame browser event. A stored theme that differs from the OS was checked in both directions.

## Different particle counts on two domains

Question: the preview deployment seemed to draw more particles than production, with identical code.

- Deployed files compared byte for byte: only an unrelated file differed.
- The per-origin snippet in a clean Brave profile: production reported 4 GB of memory, the preview 16 GB. Brave randomises these values per site, and the page's device tier used them.

## Did the fix cost performance?

Question: prove that a fix adds no load or runtime cost.

- `perf.mjs` with 12 alternating rounds per build, 100 ms HTML delay.
- FCP, LCP, the time the field started, fps, p95 frame time, long tasks, and heap were equal within noise. A 10 ms load-event gap was inside the run-to-run range.
