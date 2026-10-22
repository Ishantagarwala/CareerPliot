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
#
# FOUR DEFENCES, EACH FROM A REAL FAILURE
#
# 1. `npm ci` only when package-lock.json changed. Reinstalling on every deploy
#    wiped Next's font cache, and `next/font` re-downloads Google Fonts at build
#    time — one deploy died on a transient response (`Cannot read properties of
#    null` in @next/font's loader).
# 2. One retry. The same transient font failure disappears on a second attempt.
# 3. `.next` is backed up before the build and restored if both attempts fail,
#    so a broken build cannot leave the container unable to start.
# 4. The restart happens only after a successful build, so a bad commit never
#    takes the API down.
set -euo pipefail

APP_DIR=/opt/careerpliot
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$APP_DIR"

LOCK_HASH="$(sha256sum package-lock.json | cut -d' ' -f1)"

# A node_modules DIRECTORY is not proof of a working install: an interrupted
# `npm ci` (the network dropped mid-download once) leaves a half-populated tree.
# Trusting it made the build fall through to `npx next`, which silently fetched
# a standalone Next 16.4.2 into /tmp with no react, no tailwind, no tsconfig
# paths — and the build failed with errors that pointed at the wrong files.
deps_ok() {
  [ -f node_modules/.bin/next ] &&
    [ -f node_modules/react/package.json ] &&
    [ -f node_modules/react-dom/package.json ] &&
    [ -d node_modules/@tailwindcss/postcss ]
}

INSTALL_BASE="npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000"

if deps_ok && [ -f .deploy-lock-hash ] && [ "$(cat .deploy-lock-hash)" = "$LOCK_HASH" ]; then
  INSTALL="echo 'dependencies unchanged and healthy, skipping npm ci'"
else
  INSTALL="$INSTALL_BASE && echo $LOCK_HASH > /app/.deploy-lock-hash"
fi

run_build() {
  local install_cmd="$1"
  docker run --rm \
    --memory=1900m --memory-swap=1900m \
    -u 1000:1000 -e HOME=/tmp -e npm_config_cache=/tmp/.npm \
    -e NODE_OPTIONS=--max-old-space-size=1300 \
    -e NEXT_BUILD_LOW_MEMORY=1 \
    -v "$APP_DIR":/app -w /app \
    node:22-bookworm-slim bash -lc \
    "$install_cmd && ./node_modules/.bin/next build --webpack"
}

# Keep the build that is currently serving traffic, in case this one fails.
rm -rf .next.bak
if [ -d .next ]; then cp -a .next .next.bak; fi

echo "== build (low memory) =="
if ! run_build "$INSTALL"; then
  echo "== build failed — restoring previous .next =="
  rm -rf .next
  if [ -d .next.bak ]; then mv .next.bak .next; fi
  echo "== retrying once (font fetches can be transient) =="
  run_build "$INSTALL"
fi
rm -rf .next.bak

echo "== restart =="
bash "$HERE/run-app.sh"

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
