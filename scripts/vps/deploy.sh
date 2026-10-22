#!/usr/bin/env bash
# Build and restart CareerPilot on the rapidseedbox host.
#
# WHY --webpack + NEXT_BUILD_LOW_MEMORY=1
#
# The host has 2.5 GB of RAM and no swap (`swapon` is refused by the container
# stack), so a default Turbopack build is OOM-killed — verified: the build died
# at ~1.79 GB RSS twice. The low-memory profile runs a single worker with
# webpack's memory optimisations and completes. It is slower, so use it only on
# this host; `npm run build` remains the fast path everywhere else.
set -euo pipefail

APP_DIR=/opt/careerpliot
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

echo "== build (low memory) =="
docker run --rm \
  --memory=1900m --memory-swap=1900m \
  -u 1000:1000 -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
  -e NODE_OPTIONS=--max-old-space-size=1300 \
  -e NEXT_BUILD_LOW_MEMORY=1 \
  -v "$APP_DIR":/app -w /app \
  node:22-bookworm-slim bash -lc "npm ci --no-audit --no-fund && npx next build --webpack"

echo "== restart =="
"$HERE/run-app.sh"

for _ in $(seq 1 20); do
  if curl -sf -o /dev/null http://127.0.0.1:3000/login; then
    echo "app healthy"
    exit 0
  fi
  sleep 2
done

echo "app did not come up" >&2
docker logs careerpliot --tail 30 >&2 || true
exit 1
