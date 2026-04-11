#!/usr/bin/env bash
set -euo pipefail

BUILD_SOURCE="${1:-}"
TARGET_ROOT="${2:-.}"
REQUIRE_GIT="${REQUIRE_GIT:-1}"

if [ -z "$BUILD_SOURCE" ]; then
  echo "Usage: $0 <build-source-dir> [target-root-dir]"
  exit 1
fi

if [ ! -d "$BUILD_SOURCE" ]; then
  echo "Build source directory does not exist: $BUILD_SOURCE"
  exit 1
fi

# Normalize BUILD_SOURCE to always end with '/'
case "$BUILD_SOURCE" in
  */) ;;
  *) BUILD_SOURCE="${BUILD_SOURCE}/" ;;
esac

if [ ! -d "$TARGET_ROOT" ]; then
  echo "Target root directory does not exist: $TARGET_ROOT"
  exit 1
fi

if [ ! -f "${BUILD_SOURCE}index.html" ]; then
  echo "Build artifact is missing index.html at ${BUILD_SOURCE}index.html"
  exit 1
fi

if grep -q 'src="/src/main.tsx"' "${BUILD_SOURCE}index.html"; then
  echo "Refusing to deploy non-built index.html (contains /src/main.tsx)."
  exit 1
fi

if [ ! -d "${BUILD_SOURCE}assets" ]; then
  echo "Build artifact is missing assets/ directory at ${BUILD_SOURCE}assets"
  exit 1
fi

extract_asset_refs() {
  local html_file="$1"
  grep -Eo '(src|href)=["'"'"']/assets/[^"'"'"' >]+' "$html_file" \
    | sed -E 's/^(src|href)=["'"'"'](\/assets\/[^"'"'"']+)$/\2/' \
    | sort -u || true
}

missing_asset=0
while IFS= read -r asset_ref; do
  [ -z "$asset_ref" ] && continue
  asset_ref="${asset_ref%%\?*}"
  asset_ref="${asset_ref%%\#*}"
  asset_path="${asset_ref#/}"
  if [ ! -f "${BUILD_SOURCE}${asset_path}" ]; then
    echo "Build artifact index.html references missing file: ${asset_ref}"
    missing_asset=1
  fi
done < <(extract_asset_refs "${BUILD_SOURCE}index.html")

if [ "$missing_asset" -ne 0 ]; then
  echo "Refusing to deploy build with broken asset references in index.html"
  exit 1
fi

if [ "$REQUIRE_GIT" = "1" ] && [ ! -d "${TARGET_ROOT}/.git" ]; then
  echo "Unexpected target root — .git not found at ${TARGET_ROOT}/.git"
  exit 1
fi

# Remove root-level entries while preserving git metadata, workflow copy,
# preview directories, and the custom-domain CNAME file.
find "$TARGET_ROOT" -maxdepth 1 -mindepth 1 \
  ! -name '.git' \
  ! -name '.github' \
  ! -name 'draft' \
  ! -name 'pr-preview' \
  ! -name 'CNAME' \
  -exec rm -rf {} +

# Copy build output into target root.
cp -rp "${BUILD_SOURCE}." "$TARGET_ROOT/"

if [ ! -d "${TARGET_ROOT}/assets" ]; then
  echo "Post-merge validation failed: target root has no assets/"
  exit 1
fi

if grep -q 'src="/src/main.tsx"' "${TARGET_ROOT}/index.html"; then
  echo "Post-merge validation failed: index.html still references /src/main.tsx"
  exit 1
fi

missing_deployed_asset=0
while IFS= read -r asset_ref; do
  [ -z "$asset_ref" ] && continue
  asset_ref="${asset_ref%%\?*}"
  asset_ref="${asset_ref%%\#*}"
  asset_path="${asset_ref#/}"
  if [ ! -f "${TARGET_ROOT}/${asset_path}" ]; then
    echo "Post-merge validation failed: index.html references missing file ${asset_ref}"
    missing_deployed_asset=1
  fi
done < <(extract_asset_refs "${TARGET_ROOT}/index.html")

if [ "$missing_deployed_asset" -ne 0 ]; then
  echo "Post-merge validation failed: broken asset references in deployed index.html"
  exit 1
fi

echo "Merge validation passed for target: ${TARGET_ROOT}"
