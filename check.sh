#!/usr/bin/env bash
# Canonical gate. CI runs this. Humans run `make check` (same thing).
# Keep steps fast-first; build last as the end-to-end proof.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> format:check"
npm run -s format:check

echo "==> lint"
npm run -s lint

echo "==> guard"
npm run -s guard

echo "==> typecheck"
npm run -s typecheck

echo "==> test"
npm run -s test

echo "==> build"
npm run -s build

echo "OK: all checks passed."
