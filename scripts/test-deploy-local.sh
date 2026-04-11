#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d dist ]; then
  echo "dist/ not found. Run a build first (for example: pixi run build-ghpages)."
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
TARGET_ROOT="${TMP_DIR}/gh-pages-root"
mkdir -p "$TARGET_ROOT"

# Simulate the real production target by snapshotting gh-pages if available.
if git fetch origin gh-pages --depth=1 >/dev/null 2>&1 && git rev-parse --verify origin/gh-pages >/dev/null 2>&1; then
  git archive origin/gh-pages | tar -x -C "$TARGET_ROOT"
else
  mkdir -p "$TARGET_ROOT/draft" "$TARGET_ROOT/pr-preview"
fi

REQUIRE_GIT=0 ./scripts/merge-pages-root.sh ./dist "$TARGET_ROOT"

echo "Local deploy simulation succeeded."
echo "Referenced assets in simulated deployed index.html:"
grep -o '/assets/[^" ]*' "$TARGET_ROOT/index.html" | sort -u
