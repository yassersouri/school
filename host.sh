#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Serving $DIR on http://localhost:$PORT"
open "http://localhost:$PORT" 2>/dev/null || true

python3 -m http.server "$PORT" --directory "$DIR"
