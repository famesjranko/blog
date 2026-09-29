# Methods

Each entry says what the method can see, what it cannot see, and the traps found so far. The commands for a recording are in `setup.md`. `examples.md` shows the methods combined.

## 1. Headless screencast

`scripts/screencast.mjs` captures the renderer's frames (CDP `Page.startScreencast`) while the page reloads, in a headed or a `--headless=new` browser. Measure the frames with ffmpeg:

```bash
node "$K/screencast.mjs" 9334 http://127.0.0.1:8801/ 5 "$S/sc"
ffmpeg -nostdin -loglevel error -i "$S/sc/frame-%05d.jpg" \
  -vf "crop=W:H:X:Y,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$S/sc/yavg.txt" -f null -
```

- It sees what the renderer paints: wrong colours, late styles, content in the wrong order.
- It does not see what the GPU and the compositor present. Example: every screencast frame was dark while the user saw a white frame.
- Frames are at most 640 × 400. Choose the crop from one of them.
- A Playwright screencast works too. In the Playwright MCP `run_code` sandbox there is no `require` and no `setTimeout`, and the sandbox cannot reach the host's `127.0.0.1`.

## 2. Human A/B variants

Serve one build per variant (`setup.md` sections 2–3), and ask the user to try each one:

> Refresh each URL 15 times in Brave, and tell me how many times it flashed:
> http://127.0.0.1:8801/ (control), http://127.0.0.1:8802/ (canvas never starts).

- It sees what the user sees, on their hardware, when no capture route exists.
- Small samples lie (`SKILL.md` step 6). Several early 3-try answers were false negatives, and they led to a wrong conclusion.
- Replies often do not name the variant. Ask which one the reply is about.
- DevTools gives variants without a build: Rendering, emulate `prefers-reduced-motion` or `prefers-color-scheme`; Command menu (Ctrl+Shift+P), Disable JavaScript.

## 3. Engine and backend attribution

Run the same page in each engine on the same machine: Firefox (Gecko) and the Chromium shells (Chrome, Brave, Konqueror on QtWebEngine). Firefox has no CDP: `mkdir "$S/ff" && firefox --new-instance --profile "$S/ff" <url>`.

- A result in one engine only points at that engine's path. The page can still carry a workaround.
- Compare `--ozone-platform=x11` with the default Wayland backend to test the display backend.
- The GPU-status snippet gives the backend in use: ANGLE, Skia, Vulkan, Graphite.

## 4. Minimal repro pages

Write the smallest page that can show the effect, outside the project. Then add project pieces back one at a time.

- A clean repro proves only that a missing piece matters. Continue to add pieces.
- Use contrasting colours. A dark page can hide a frame where the dark background shows through.

## 5. Browser stderr

The launch in `setup.md` sends the browser's stderr to a log. It shows GPU-process errors that no page API reports. The GPU-log snippet counts one line per load.

- A log count is a hint. It is not proof. Example: an error line occurred in 8 of 10 control loads and 0 of 10 without the feature, and later fell to 0 on the control for no clear reason.

## 6. Screen recording

`rec.sh` and `ab.sh` record what the compositor presents. This is the only method here that sees the screen.

- It needs an X11 window. Under rootless XWayland, the root window records as black; `rec.sh` records the browser window instead.
- The window must stay visible and uncovered for the whole run.
- On GNOME, other Wayland compositors, macOS, or Windows the capture route differs. Say that it is untested. Do not guess.

## 7. Load types and start page

What the browser shows during a load depends on how the load starts.

- Reload, and a same-site link: the browser usually keeps the old page on screen until the new one paints. This hides first-paint effects and exposes effects of the old page's teardown.
- First visit (`-C`): about:blank, `Network.clearBrowserCache`, then the URL. A fresh browser's first load behaves like this too.
- The start page matters. Example: from about:blank the control painted white before its stylesheet; from a white `data:` page every variant, the control too, painted the browser's dark fallback, which hid the effect under test.

## 8. Network and resource delay

`slow.py` delays HTML (`--delay-ms`) and stylesheets (`--css-delay-ms`).

- A fix that depends on navigation timing can pass at a real delay and fail at 0 ms. Test both. Example: a fix that hid an element when navigation started held at 30, 60, and 150 ms, and could fail at 0 ms.
- A delay makes a short event long enough to count. Example: a 2-frame white before first paint occurred on 0 to 24 of 30 cold loads; with a 300 ms CSS delay it lasted about 16 frames on 20 of 20 loads.
- A delay changes the length of an event, not which layer paints it. Confirm that from the frames.

## 9. Performance A/B

`scripts/perf.mjs CDP_PORT ROUNDS URL_A URL_B` loads two builds alternately in the real browser, and prints medians.

- It records FCP, LCP, DOMContentLoaded, load, long tasks, and the time the page first asks a canvas for a context. A 4 s `requestAnimationFrame` loop gives fps, p95 frame time, and frames over 25 ms. `Performance.getMetrics` gives the JS heap.
- It installs its observers with `Page.addScriptToEvaluateOnNewDocument`, which does nothing unless `Page.enable` was called first.
- A difference inside run-to-run noise is noise. Say so.

## 10. Back/Forward cache

The bfcache snippet records `pageshow.persisted`, follows a link, calls `history.back()`, and reads the state.

- A page that changes itself when it leaves must undo the change on `pageshow`. The cache restores the page as it was left.
- A `beforeunload` listener keeps Firefox from caching the page. Register one only in the engine that needs it.

## Environment traps

- Brave randomises `navigator.hardwareConcurrency` and `navigator.deviceMemory` for each site (eTLD+1). Device-tier logic can pick a different quality on two domains. Check with the per-origin snippet in a clean profile before you blame a code change.
- `navigator.userAgentData` exists only in secure contexts (HTTPS or localhost). A plain-HTTP LAN preview behaves differently.
- Chromium can ignore later edits to some head elements for the frames before first paint. Example: an edit to a `color-scheme` meta had no effect; a new meta inserted ahead of it did. Test the element as the browser first parses it.
