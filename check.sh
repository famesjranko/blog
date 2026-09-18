#!/usr/bin/env bash
# Compatibility entry point only. `make check` is the sole definition
# of the full validation gate; do not duplicate its steps here.
set -euo pipefail
cd "$(dirname "$0")"
exec make check
