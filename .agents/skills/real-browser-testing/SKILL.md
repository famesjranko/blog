---
name: real-browser-testing
description: Measure what a real browser shows and does on the user's machine: frame-by-frame screen recording, cold and warm loads, injected network delay, A/B builds, engine comparison, performance, and back/forward cache. Use to reproduce or measure a visual or timing bug, or to prove a UI fix without regressions. Not for bugs that a unit test, headless run, or screenshot can show.
disable-model-invocation: true
---
# Real-browser testing

Measure what reaches the screen in a real browser, and compare builds under controlled conditions.

## Inputs

- The question: a symptom to reproduce, a fix to prove, or a change to check for regressions.
- The machine: OS, desktop session, GPUs, and browsers. `references/setup.md` section 1 prints them.
- A build of the site that you can copy and serve locally (for this blog, `dist/` after `make build`).
- The session scratchpad, for every artefact: build copies, browser profiles, logs, recordings.
- The scripts in `scripts/`. Each prints its usage when you run it without arguments.

## Steps

### What this can test

| Question | Method | Tool |
|---|---|---|
| What exactly is on screen, frame by frame? | Record the browser window at 60 fps; measure a region per frame; tile frames around each event | `rec.sh`, `ab.sh` |
| What does the renderer paint? (cheap, headless) | CDP screencast; measure a region per frame | `screencast.mjs` |
| First visit, or reload only? | Cold loads (about:blank, HTTP cache cleared, then the URL) against reloads | `rec.sh -C`, `reload.mjs` |
| Does it depend on network timing? | Delay HTML, CSS, or both | `slow.py` |
| Which change causes it, or fixes it? | A/B builds: one copy per variant, one change per copy, one port per copy | `slow.py`, `ab.sh` |
| The page, the engine, or the display stack? | Same page in Gecko and Chromium shells; X11 against Wayland backend; a minimal repro page | `methods.md` 3–4 |
| Did a change cost load time or smoothness? | Alternate A and B loads: FCP, LCP, long tasks, fps, frame time, heap | `perf.mjs` |
| Does Back/Forward still restore the page? | `pageshow.persisted` and page state after `history.back()` | snippet |
| What does the browser know that the page cannot see? | Browser stderr (GPU process errors); GPU feature status | snippets |
| Does the browser report false values to the page? | `hardwareConcurrency`, `deviceMemory`, `userAgentData`, `isSecureContext` per origin | snippet |

### Procedure

1. State the question in numbers: the rate ("about 1 in 3 loads"), the duration, the region, the browsers, and the navigation (reload, link, first visit). For a change, name the metric that must not get worse. Ask the user for a missing fact, one question at a time. If the caller gave all the facts, continue.
2. Write one specific hypothesis before each experiment. Change one variable per experiment.
3. Choose the cheapest method that can see the effect. A screencast sees what the renderer paints. Only a screen recording sees what the compositor presents.
4. Prove that the control fails on your test path before you test a fix. If a first block of the control is clean, increase the loads, or stretch the event (step 5). Do not test the fix until the control fails. The start page, the load type, the cache, the delay, and window visibility can each hide an effect.
5. Make a rare event frequent. Slow down what ends the bad period: `slow.py --css-delay-ms` stretches the time before first paint, and `--delay-ms` the time to first byte. Confirm from the frames that the stretched event is the same kind.
6. Take enough samples. At an event rate p, n clean loads occur with probability (1 - p)^n; at p = 0.3, 10 clean loads still occur 2.8 % of the time. Record at least 30 loads per build, and more when the rate is under 20 %. Ask a human tester for a count over 10 to 15 tries per variant, never a yes or no after 3.
7. Interleave builds (A, B, B, A ...) with the same settings and start page. `ab.sh` does this. Rates drift between recordings, so separate back-to-back runs cannot compare builds.
8. Look at every flagged frame before you count it, and count each kind of event separately (`setup.md` section 8). An event that is not the one under test is a finding. Report it.
9. Mutation-check the result. Remove one line of the fix, and confirm that the same harness now fails.
10. Check for side effects: performance with `perf.mjs`, Back/Forward restore, and each engine that the change touches.
11. Clean up (`setup.md` section 9). Tell the user the size of the recordings left in the scratchpad.

## Stop conditions

- A window is about to open on the user's desktop, and you have not told them. Tell them first.
- A launch would use the user's real browser profile. Use a throwaway `--user-data-dir` in the scratchpad.
- `rec.sh` needs the browser as an X11 window: an X11 session, or XWayland (`--ozone-platform=x11`) in a Wayland session. It is tested on X11 and KDE Plasma only. On any other desktop, report that the capture route is untested. Do not guess one.
- The test window is covered. Compositor capture sees only what is on the screen.
- Three hypotheses failed. Examine the evidence again (browser stderr, frame images) before a fourth experiment.
- The result passes, and you cannot explain it from the frames or the logs. Treat the cause as unconfirmed.

## Report

```
BROWSER TEST REPORT
Question:     <symptom or change under test, in numbers>
Setup:        <browsers and versions, machine, builds, start page, load type, delays, crop, threshold>
Control:      <events>/<loads>, and how you know the control fails on this path
Result:       <events>/<loads> per build, interleaved; each event kind counted separately
Frames:       <what the bad frames show, and what that proves>
Mutation:     <line removed, check that failed> (when a fix is under test)
Side effects: <perf medians A vs B, bfcache, other engines> (when a change is under test)
Artefacts:    <scratchpad paths, sizes>
Limits:       <what the methods could not see; untested browsers and platforms>
```

## References

- `references/setup.md`: the commands for a run, in order. Read it before you run anything.
- `references/methods.md`: each method's reach, limits, and traps. Read it when you choose a method, or when a result looks wrong.
- `references/snippets.md`: manual capture, and the bfcache, per-origin, GPU-log, window, and GPU-status checks.
- `references/examples.md`: worked examples that combine the methods.
