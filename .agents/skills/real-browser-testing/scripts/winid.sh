#!/usr/bin/env bash
# Usage: winid.sh PROFILE_DIR — print the X window id of the test browser started with
# --user-data-dir=PROFILE_DIR. Chromium puts a non-default profile path into the window
# class, so the path identifies the window. Hidden helper windows also match; the largest
# one is the browser window. Exits 1 if none is found.
set -euo pipefail
[[ $# -eq 1 ]] || { echo "usage: winid.sh PROFILE_DIR" >&2; exit 2; }
win="$(xwininfo -root -tree | grep -F -- "$1" | while read -r line; do
  geometry="$(grep -oE ' [0-9]+x[0-9]+[+-]' <<<"$line" | head -n 1 | tr -d ' +-')"
  [[ -n "$geometry" ]] && echo "$(( ${geometry%x*} * ${geometry#*x} )) ${line%% *}"
done | sort -n | tail -n 1 | cut -d' ' -f2)"
[[ -n "$win" ]] || { echo "no X window found for profile $1" >&2; exit 1; }
echo "$win"
