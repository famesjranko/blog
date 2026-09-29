#!/usr/bin/env bash
# Record several builds in alternation with rec.sh, and print labelled totals.
#
# Usage: ab.sh -o OUTDIR -p PROFILE_DIR [-P CDP_PORT] [-c W:H:X:Y] [-t THRESHOLD] [-C] [-k]
#              -r ROUNDS -n LOADS NAME=URL [NAME=URL ...]
#
# Each round records one block of LOADS loads per build. The build order reverses every
# other round (A B, B A, A B ...). -C records cold first visits instead of reloads.
# Writes OUTDIR/NAME-ROUND/ (rec.sh output and rec.log) and OUTDIR/summary.txt.
# A block's video is deleted when it has no events, unless -k is given.
# The last line printed is "DONE", or "FAILED" if a block failed, so a background run
# can be polled for either.
set -euo pipefail

usage() { sed -n '4,5p' "$0" | sed 's/^# //' >&2; exit 2; }
here="$(cd "$(dirname "$0")" && pwd)"
out="" profile="" rounds="" loads="" keep="" pass=()
while getopts "o:p:P:c:t:r:n:Ck" opt; do
  case "$opt" in
    o) out="$OPTARG" ;; p) profile="$OPTARG" ;; r) rounds="$OPTARG" ;; n) loads="$OPTARG" ;;
    P | c | t) pass+=("-$opt" "$OPTARG") ;; C) pass+=(-C) ;; k) keep=1 ;; *) usage ;;
  esac
done
shift $((OPTIND - 1))
[[ -n "$out" && -n "$profile" && -n "$rounds" && -n "$loads" && $# -ge 1 ]] || usage
builds=("$@")
mkdir -p "$out"
block_log=""
on_exit() {
  local status=$?
  [[ $status -eq 0 ]] || echo "FAILED (exit $status)${block_log:+; see $block_log}"
}
trap on_exit EXIT
# Totals come from this run's blocks only, so a reused OUTDIR or a build whose name
# starts with another build's name cannot change them.
declare -A events lengths

for round in $(seq 1 "$rounds"); do
  order=("${builds[@]}")
  if (( round % 2 == 0 )); then
    order=(); for (( i = ${#builds[@]} - 1; i >= 0; i-- )); do order+=("${builds[i]}"); done
  fi
  for build in "${order[@]}"; do
    name="${build%%=*}" url="${build#*=}" dir="$out/${build%%=*}-$round"
    block_log="$dir.log"
    "$here/rec.sh" -o "$dir" -p "$profile" "${pass[@]}" "$url" "$loads" >"$block_log" 2>&1
    mv "$dir.log" "$dir/rec.log"
    count="$(wc -l <"$dir/events.txt")"
    events[$name]=$(( ${events[$name]:-0} + count ))
    lengths[$name]+="$(awk '{ printf "%d ", $2 - $1 + 1 }' "$dir/events.txt")"
    echo "round $round $name: $count events"
    [[ -n "$keep" || -s "$dir/events.txt" ]] || rm -f "$dir/rec.mkv"
  done
done

{
  for build in "${builds[@]}"; do
    name="${build%%=*}"
    printf '%s: %d events in %d loads; lengths in frames: %s\n' "$name" \
      "${events[$name]:-0}" "$(( rounds * loads ))" "${lengths[$name]:-none}"
  done
} | tee "$out/summary.txt"
echo DONE
