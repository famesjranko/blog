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
# The last line printed is "DONE", so a background run can be polled for it.
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

for round in $(seq 1 "$rounds"); do
  order=("${builds[@]}")
  if (( round % 2 == 0 )); then
    order=(); for (( i = ${#builds[@]} - 1; i >= 0; i-- )); do order+=("${builds[i]}"); done
  fi
  for build in "${order[@]}"; do
    name="${build%%=*}" url="${build#*=}" dir="$out/${build%%=*}-$round"
    "$here/rec.sh" -o "$dir" -p "$profile" "${pass[@]}" "$url" "$loads" >"$dir.log" 2>&1
    mv "$dir.log" "$dir/rec.log"
    echo "round $round $name: $(wc -l <"$dir/events.txt") events"
    [[ -n "$keep" || -s "$dir/events.txt" ]] || rm -f "$dir/rec.mkv"
  done
done

{
  for build in "${builds[@]}"; do
    name="${build%%=*}"
    lengths="$(cat "$out/$name"-*/events.txt | awk '{ printf "%d ", $2 - $1 + 1 }')"
    printf '%s: %d events in %d loads; lengths in frames: %s\n' "$name" \
      "$(cat "$out/$name"-*/events.txt | wc -l)" "$(( rounds * loads ))" "${lengths:-none}"
  done
} | tee "$out/summary.txt"
echo DONE
