#!/usr/bin/env bash
# Usage: winid.sh PROFILE_DIR — print the X window id of the test browser started with
# --user-data-dir=PROFILE_DIR. Exits 1 if none is found.
#
# Chromium sets a window's class instance to "<name> (PROFILE_DIR)" for a non-default
# profile. Only that field is compared, and the path must be equal, so a terminal whose
# title shows the path, or a second profile such as PROFILE_DIR0, does not match.
# Hidden helper windows of the same browser also match; the largest one is the window.
set -euo pipefail
[[ $# -eq 1 ]] || { echo "usage: winid.sh PROFILE_DIR" >&2; exit 2; }
# One xwininfo tree line: 0x1400004 "Title": ("brave-browser (/tmp/p1)" "Brave-browser")  1425x1010+0+0  +0+0
class_re='\("[^"]* \(([^"]*)\)" "[^"]*"\)[[:space:]]+([0-9]+)x([0-9]+)[+-]'
best="" best_area=0
while read -r line; do
  [[ $line =~ $class_re && ${BASH_REMATCH[1]} == "$1" ]] || continue
  area=$(( BASH_REMATCH[2] * BASH_REMATCH[3] ))
  if (( area > best_area )); then
    best="${line%% *}" best_area=$area
  fi
done < <(xwininfo -root -tree)
[[ -n "$best" ]] || { echo "no X window found for profile $1" >&2; exit 1; }
echo "$best"
