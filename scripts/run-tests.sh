#!/usr/bin/env bash
set -euo pipefail

# Frontend-only test runner. Assumes a backend is already running and reachable
# via VITE_API_URL (defaults to http://localhost:8000).

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

: "${VITE_API_URL:=http://localhost:8000}"
: "${VITE_DEV_MODE:=true}"

echo "Running frontend tests with VITE_API_URL=${VITE_API_URL} (VITE_DEV_MODE=${VITE_DEV_MODE})"
echo "npm run test:run -- ${*:-}"

VITE_API_URL="$VITE_API_URL" \
VITE_DEV_MODE="$VITE_DEV_MODE" \
npm run test:run -- "$@"
