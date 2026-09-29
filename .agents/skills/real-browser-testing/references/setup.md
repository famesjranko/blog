# Setup and run

The commands assume Bash, the session scratchpad in `$S`, and the skill's scripts in `$K`:

```bash
S=<session scratchpad>
K=<repository>/.agents/skills/real-browser-testing/scripts
```

## 1. Check the tools and the machine

```bash
for t in node python3 ffmpeg xwininfo curl; do command -v "$t" >/dev/null && echo "ok $t" || echo "MISSING $t"; done
for b in brave-browser google-chrome chromium firefox; do command -v "$b" >/dev/null && echo "browser $b"; done
node -e 'console.log(typeof WebSocket === "function" ? "ok node WebSocket" : "MISSING: Node 22 or later is necessary")'
ffmpeg -hide_banner -devices 2>/dev/null | grep -q x11grab && echo "ok ffmpeg x11grab" || echo "MISSING ffmpeg x11grab"
echo "session: ${XDG_SESSION_TYPE:-?} desktop: ${XDG_CURRENT_DESKTOP:-?} display: ${DISPLAY:-none}"
```

Compare the session and desktop with the stop conditions in `SKILL.md`. If a tool is missing, tell the user. Do not install system packages without permission.

## 2. Make the builds

Build once, then make one copy per build, and change one thing in each copy.

```bash
make build                      # writes dist/; it can also rewrite generated files in the repo
rm -rf "$S/v" && mkdir -p "$S/v"
cp -r dist "$S/v/control"
cp -r dist "$S/v/fix"
git show <ref>:static/js/hero.js > "$S/v/fix/js/hero.js"    # a file from another branch or commit
diff -r "$S/v/control" "$S/v/fix"                             # must show exactly the intended change
```

- In this blog, `static/` is copied into `dist/` as it is: `static/js/x.js` becomes `dist/js/x.js`. Files built from `src/` (HTML, CSS) need a build of that commit instead: `git worktree add "$S/wt" <ref>`, `npm ci` and `make build` there, then `git worktree remove "$S/wt"`.
- To patch a copy by hand, replace an exact string and fail if it is absent. A `sed` that matches nothing fails silently.

```bash
python3 - "$S/v/fix/js/hero.js" <<'EOF'
import sys
p = sys.argv[1]; t = open(p).read()
old = "\tscheduleField(hero);\n"
assert old in t, "patch target not found"
open(p, "w").write(t.replace(old, "", 1))
EOF
```

## 3. Serve each build

```bash
python3 -B "$K/slow.py" --dir "$S/v/control" --port 8801 --delay-ms 60 >"$S/serve-8801.log" 2>&1 &
python3 -B "$K/slow.py" --dir "$S/v/fix" --port 8802 --delay-ms 60 >"$S/serve-8802.log" 2>&1 &
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8801/    # expect 200
```

Use ports that nothing else uses. Set `--delay-ms` at or below the real site's time to first byte (`curl -o /dev/null -s -w '%{time_starttransfer}\n' <url>`). Add `--css-delay-ms 300` to stretch the time before first paint.

## 4. Launch a test browser

Tell the user before a window opens. Use a new profile directory for each clean browser. Never use the user's real profile.

```bash
brave-browser --ozone-platform=x11 --user-data-dir="$S/p1" --remote-debugging-port=9333 \
  --no-first-run --no-default-browser-check --window-size=1200,850 \
  --enable-logging=stderr about:blank >"$S/browser-p1.log" 2>&1 &
sleep 5; curl -s http://127.0.0.1:9333/json/version | head -3    # the CDP endpoint answers
```

- `--ozone-platform=x11` makes the window an X11 client. On a Wayland session it runs under XWayland, which `rec.sh` can record.
- `google-chrome` and `chromium` take the same flags. For a headless browser (screencast, perf), use `--headless=new` and drop the window flags.
- Force a colour preference with `--blink-settings=preferredColorScheme=1` (light) or `=0` (dark).
- A new Brave profile shows an analytics infobar under the toolbar. It moves the page down. Leave it, and keep the crop below it.

## 5. Open the page, and calibrate the crop

```bash
node "$K/reload.mjs" 9333 http://127.0.0.1:8801/ 0 2000        # navigate once, and wait
win=$("$K/winid.sh" "$S/p1")
xwininfo -id "$win" | grep -E 'Width|Height'                      # can differ from --window-size on a scaled display
ffmpeg -nostdin -loglevel error -y -f x11grab -window_id "$win" -i "$DISPLAY" -frames:v 1 "$S/frame.png"
```

- Open `$S/frame.png` with the image-viewing tool. The tool can show it scaled down. Convert what you see to window pixels with the width from `xwininfo`.
- Choose a crop `W:H:X:Y` over the region under test only. Keep the browser toolbar and infobars out of it.
- Measure the crop on the good frame:

```bash
ffmpeg -nostdin -loglevel error -i "$S/frame.png" \
  -vf "crop=W:H:X:Y,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -f null - | grep YAVG
```

- YAVG is mean luma, from about 16 (black) to 235 (white). Set the threshold between the good value and the bad colour you expect. Example: a dark region at 44 and a white flash at 235 give a threshold of 100 to 128. `rec.sh` flags frames above the threshold. For a dark flash on a light region, measure `yavg.txt` yourself with the opposite comparison.

## 6. Prove the control fails

```bash
"$K/rec.sh" -o "$S/smoke" -p "$S/p1" -P 9333 -c W:H:X:Y -t 100 http://127.0.0.1:8801/ 15
cat "$S/smoke/events.txt"
```

Look at each `event-N.png` (section 8). If the control shows no event of the kind under test, do not continue to the fix. Increase the loads, stretch the event (`--css-delay-ms`, `--delay-ms`), or change the load type (`-C` for cold first visits).

## 7. Measure the builds

`ab.sh` records the builds in alternation and prints totals. A block of N loads takes about N × 3 s, plus 1 s per load in cold mode, plus 5 s. Most runs are longer than a tool call's time limit, so start the run in the background and poll the log. It ends with `DONE`, or with `FAILED` and the log of the block that failed:

```bash
nohup "$K/ab.sh" -o "$S/ab" -p "$S/p1" -P 9333 -c W:H:X:Y -t 100 -r 6 -n 10 \
  control=http://127.0.0.1:8801/ fix=http://127.0.0.1:8802/ >"$S/ab.log" 2>&1 &
until grep -qE '^(DONE|FAILED)' "$S/ab.log"; do sleep 20; done; cat "$S/ab.log"
```

- `-r 6 -n 10` gives 60 loads per build in 6 rounds. Short blocks interleave better. Each block also costs about 4 s to open and settle the page.
- Add `-C` for cold first visits. Add `-k` to keep videos that have no events (they are deleted by default; one 30-load video is about 450 MB).
- Keep the window visible for the whole run. `rec.sh` warns when the window is not viewable. It cannot tell when another window covers it.
- `summary.txt` gives events per build and the length of each event in frames. At 60 fps, 1 frame is about 17 ms.

## 8. Read the frames

Each `event-N.png` tiles 8 frames, 4 × 2, left to right, from 3 frames before the event. The 4th tile is the first flagged frame. Open every one with the image-viewing tool, and classify the event before you count it:

- Region: one element, the whole content area, or the browser toolbar.
- Content: the old page, the new page, or neither. White over one element, between the old page's frame and the new page's frame, means that the outgoing page drew it.
- Load stage: while the tab title is still the URL, the new HTML is not parsed yet, and the browser owns the frame. When the tab shows the page's title, the head is parsed, and the page decides what paints until its stylesheet arrives. A stop (X) button in the toolbar means that a load is in progress.

To see other frames: `ffmpeg -nostdin -loglevel error -y -i rec.mkv -vf "select='between(n,A,B)',scale=360:-1,tile=4x2" -frames:v 1 tiles.png`.

## 9. Clean up

```bash
ps -eo pid,args | grep -E -- "--user-data-dir=$S/|slow.py --dir $S/" | grep -v grep | awk '{print $1}' | xargs -r kill
ps -eo args | grep -E -- "$S/" | grep -vc grep       # expect 0
ss -ltn | grep -E ':(8801|8802|9333)\b'              # expect nothing; use your ports
du -sh "$S"                                          # report the size to the user
```

The `grep -v grep` also keeps your own shell out of the list, because its command line contains both the pattern and `grep`. Do not use `pkill -f`: it has no such filter and can kill your own shell.
