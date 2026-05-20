#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $(basename "$0") [-a|--all] [-h|--help]"
  echo ""
  echo "Options:"
  echo "  -a, --all   remove dist and node_modules"
  echo "  -h, --help  show this message"
}

ALL=false
for arg in "$@"; do
  case "$arg" in
    -a|--all)  ALL=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Error: unknown option '$arg'"; usage; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

find . -type d -name ".bun-build" -print -exec rm -rf {} + 2>/dev/null || true

if [[ "$ALL" == true ]]; then
  for dir in dist node_modules; do
    [[ -d "$dir" ]] && echo "$dir" && rm -rf "$dir"
  done
fi

echo "Clean complete"
