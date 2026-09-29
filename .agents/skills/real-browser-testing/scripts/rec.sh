#!/usr/bin/env bash
# Record what reaches the screen while a page reloads, then flag bright frames.
#
# Usage: rec.sh -o OUTDIR (-p PROFILE_DIR | -w WINDOW_ID) [-P CDP_PORT] [-c W:H:X:Y]
#               [-t THRESHOLD] [-i INTERVAL_MS] [-C] URL RUNS
#
# The browser must be an X11 client (on KDE Wayland: --ozone-platform=x11, so XWayland),
# started with --user-data-dir=PROFILE_DIR and --remote-debugging-port=CDP_PORT.
# The window must stay visible and unoccluded. The page is loaded and left to settle
# before recording starts, so the cold first paint of a new browser is not recorded.
# -C records cold first visits (about:blank, cache cleared, then URL) instead of reloads.
#
# Writes to OUTDIR: rec.mkv (lossless video), yavg.txt (mean luma per frame of the crop),
# events.txt (runs of frames with YAVG above THRESHOLD), event-N.png (8 tiled frames
# around each event). Put OUTDIR in the session scratchpad. rec.mkv is large.
set -euo pipefail

usage() { sed -n '4,5p' "$0" | sed 's/^# //' >&2; exit 2; }
here="$(cd "$(dirname "$0")" && pwd)"
port=9333 crop="" threshold=128 interval=3000 out="" profile="" win="" cold=""
while getopts "o:p:w:P:c:t:i:C" opt; do
  case "$opt" in
    o) out="$OPTARG" ;; p) profile="$OPTARG" ;; w) win="$OPTARG" ;; P) port="$OPTARG" ;;
    c) crop="$OPTARG" ;; t) threshold="$OPTARG" ;; i) interval="$OPTARG" ;; C) cold=1 ;; *) usage ;;
  esac
done
shift $((OPTIND - 1))
[[ $# -eq 2 && -n "$out" && ( -n "$profile" || -n "$win" ) ]] || usage
url="$1" runs="$2"
: "${DISPLAY:?DISPLAY is not set; x11grab needs the X or XWayland display}"
mkdir -p "$out"

[[ -n "$win" ]] || win="$("$here/winid.sh" "$profile")"
echo "window $win"
xwininfo -id "$win" | grep -q IsViewable || echo "warning: window $win is not viewable; its frames will not update" >&2

node "$here/reload.mjs" "$port" "$url" 0 "$interval"
seconds=$(( runs * interval / 1000 + 3 ))
[[ -n "$cold" ]] && seconds=$(( seconds + runs ))
ffmpeg -nostdin -hide_banner -loglevel error -y -f x11grab -framerate 60 -window_id "$win" -i "$DISPLAY" \
  -t "$seconds" -c:v libx264 -qp 0 -preset ultrafast "$out/rec.mkv" &
recorder=$!
sleep 1
if [[ -n "$cold" ]]; then
  node "$here/reload.mjs" "$port" "$url" "$runs" "$interval" cold
else
  node "$here/reload.mjs" "$port" - "$runs" "$interval"
fi
wait "$recorder"

filter="signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$out/yavg.txt"
[[ -n "$crop" ]] && filter="crop=$crop,$filter"
ffmpeg -nostdin -hide_banner -loglevel error -i "$out/rec.mkv" -vf "$filter" -f null -

# One event per run of consecutive bright frames: "first last maxYAVG".
awk -v t="$threshold" '
  /^frame:/ { split($1, f, ":"); n = f[2] + 0 }
  /YAVG=/ { split($0, v, "="); y = v[2] + 0; frames++; if (y > max) max = y
    if (y > t) { if (!open) { first = n; peak = 0; open = 1 } last = n; if (y > peak) peak = y }
    else if (open) { print first, last, peak; open = 0 } }
  END { if (open) print first, last, peak
    printf "frames %d maxYAVG %.1f\n", frames, max > "/dev/stderr" }
' "$out/yavg.txt" >"$out/events.txt"

count=0
while read -r first last peak; do
  count=$((count + 1))
  printf 'event %d frames %d-%d t=%.2fs peak=%s\n' "$count" "$first" "$last" "$(awk -v f="$first" 'BEGIN { print f / 60 }')" "$peak"
  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$out/rec.mkv" \
    -vf "select='between(n,$((first - 3)),$((first + 4)))',scale=360:-1,tile=4x2" \
    -frames:v 1 "$out/event-$count.png"
done <"$out/events.txt"
echo "events $count over $runs loads; inspect every event-N.png before counting it"
