#!/usr/bin/env bash
# Pull-based deploy: run this on the VPS from a systemd timer.
#
# IMAGE-BASED DEPLOYS (this replaced the build-on-host flow)
#
# GitHub Actions builds the image and pushes it to ghcr.io (see
# .github/workflows/build-image.yml). This script never builds anything:
#
#   1. `docker pull` the `main` tag — a no-op when unchanged, and it costs
#      network + disk, not app RAM, so the old container keeps serving.
#   2. If the image changed: stop old container, start the new one, smoke-check.
#      That swap takes seconds; the old flow paused the app for a ~6-minute
#      build because the 2.5 GB host cannot build and serve at once.
#   3. If the new container fails its smoke check, restart the previous image.
#
# A bad image is attempted once, rolled back, and then SKIPPED until a newer
# one is published (state file below), so the timer does not flap the app.
#
# Safety:
#   - flock: overlapping timer runs cannot swap on top of each other.
#   - Any failure before the swap leaves the running app untouched.
#
# RAM on this host (2.5 GB, no swap, no more builds here):
#   - hard cgroup cap 900m on the app container (APP_MEM below)
#   - soft reservation 700m so the kernel reclaims under host pressure
#   - V8 heap ceiling 700m (NODE_HEAP_MB) — the app garbage-collects before
#     the cgroup would OOM-kill it
#   - `docker stats careerpliot` shows live usage against these caps.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerpliot}"
LOCK="${LOCK:-/tmp/careerpliot-deploy.lock}"
IMAGE_REPO="${IMAGE_REPO:-ghcr.io/ishantagarwala/careerpliot}"
IMAGE="$IMAGE_REPO:main"
CONTAINER=careerpliot

APP_MEM="${APP_MEM:-900m}"
APP_MEM_RESERVATION="${APP_MEM_RESERVATION:-700m}"
NODE_HEAP_MB="${NODE_HEAP_MB:-700}"

SMOKE_URL="${SMOKE_URL:-http://127.0.0.1:3000/login}"
# Smoke window = SMOKE_TRIES x SMOKE_SLEEP (default 30 x 2s = 60s). Tunable so
# an operator on a slow (or fast) host can widen or narrow it.
SMOKE_TRIES="${SMOKE_TRIES:-30}"
SMOKE_SLEEP="${SMOKE_SLEEP:-2}"
FAILED_STATE="$APP_DIR/.last-failed-image"

# `--force`: recreate the container even when the image is unchanged (useful
# after editing .env.production) and retry an image the state file rejected.
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "another deploy is already running — skipping"
  exit 0
fi

if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "missing $APP_DIR/.env.production — not touching the running app" >&2
  exit 1
fi

echo "== checking $IMAGE =="
if ! docker pull "$IMAGE"; then
  echo "" >&2
  echo "pull failed. If this is the first deploy after the image migration:" >&2
  echo "the GHCR package starts PRIVATE. Make it public once via GitHub →" >&2
  echo "your profile → Packages → careerpliot → Package settings → Change visibility." >&2
  echo "(Or keep it private and docker-login on this host with a read-only token.)" >&2
  exit 1
fi

NEW_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE")"
OLD_ID="$(docker inspect --format '{{.Image}}' "$CONTAINER" 2>/dev/null || true)"

if [ "$FORCE" -eq 0 ] && [ "$NEW_ID" = "$OLD_ID" ]; then
  echo "up to date at ${NEW_ID#sha256:}"
  exit 0
fi

if [ "$FORCE" -eq 0 ] && [ -f "$FAILED_STATE" ] && [ "$(cat "$FAILED_STATE")" = "$NEW_ID" ]; then
  echo "image ${NEW_ID#sha256:} already failed its smoke check — not retrying."
  echo "a newer image (or --force) clears this."
  exit 0
fi

REVISION="$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$IMAGE")"
echo "== deploying image for ${REVISION:-unknown revision} =="

mkdir -p "$APP_DIR/storage/uploads"

# Mounts: private uploads (required), plus the legacy public/uploads directory
# from the pre-image deployment when it exists, so old download URLs keep
# resolving.
declare -a MOUNTS=(-v "$APP_DIR/storage/uploads:/app/storage/uploads")
if [ -d "$APP_DIR/public/uploads" ]; then
  MOUNTS+=(-v "$APP_DIR/public/uploads:/app/public/uploads")
fi

run_container() { # $1 = image reference or ID
  docker run -d --name "$CONTAINER" --restart unless-stopped \
    --memory="$APP_MEM" --memory-swap="$APP_MEM" \
    --memory-reservation="$APP_MEM_RESERVATION" \
    -e NODE_OPTIONS="--max-old-space-size=$NODE_HEAP_MB" \
    -p 127.0.0.1:3000:3000 \
    -u 1000:1000 -e HOME=/tmp \
    --env-file "$APP_DIR/.env.production" \
    -e NODE_ENV=production -e HOSTNAME=0.0.0.0 -e PORT=3000 \
    -e AUTH_TRUST_HOST=true \
    -e AUTH_URL=https://careerpilot.cc -e NEXTAUTH_URL=https://careerpilot.cc \
    -e NEXT_PUBLIC_SITE_URL=https://careerpilot.cc -e DEMO_MODE=true \
    "${MOUNTS[@]}" \
    "$1" >/dev/null
}

smoke_ok() {
  local i
  for i in $(seq 1 "$SMOKE_TRIES"); do
    if curl -sf -o /dev/null "$SMOKE_URL"; then return 0; fi
    sleep "$SMOKE_SLEEP"
  done
  return 1
}

# Roll back only to an image from this repository. The very first image deploy
# replaces a container that ran from a source mount; recreating THAT needs the
# old run-app.sh from git history, not this script.
ROLLBACK_OK=0
if [ -n "$OLD_ID" ]; then
  OLD_REPO="$(docker image inspect --format '{{index .RepoTags 0}}' "$OLD_ID" 2>/dev/null || true)"
  case "$OLD_REPO" in
    "$IMAGE_REPO"*) ROLLBACK_OK=1 ;;
  esac
fi

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

if ! run_container "$IMAGE"; then
  echo "!! could not start the new container" >&2
  if [ "$ROLLBACK_OK" -eq 1 ]; then
    run_container "$OLD_ID" || true
  fi
  echo "$NEW_ID" > "$FAILED_STATE"
  exit 1
fi

if smoke_ok; then
  echo "== app healthy on the new image =="
  rm -f "$FAILED_STATE"
else
  echo "!! new image failed its smoke check ($SMOKE_URL)" >&2
  if [ "$ROLLBACK_OK" -eq 1 ]; then
    echo "== rolling back to the previous image ==" >&2
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    if run_container "$OLD_ID" && smoke_ok; then
      echo "== rollback healthy — production is on the previous image ==" >&2
    else
      echo "!! rollback is also unhealthy — inspect: docker logs $CONTAINER" >&2
    fi
  else
    echo "!! no rollback image available. The pre-image container ran from a" >&2
    echo "!! source mount; recreate it with the old run-app.sh from git history." >&2
  fi
  echo "$NEW_ID" > "$FAILED_STATE"
  exit 1
fi

# Housekeeping: keep the newest two images of this repo (plus whatever the
# running/rollback containers use) so the disk does not fill with old builds.
KEEP=2
mapfile -t ALL_IDS < <(docker images --format '{{.ID}}' "$IMAGE_REPO" | awk '!seen[$0]++')
for id in "${ALL_IDS[@]:KEEP}"; do
  [ "$id" = "$NEW_ID" ] && continue
  [ "$id" = "$OLD_ID" ] && continue
  docker rmi "$id" >/dev/null 2>&1 || true
done
docker image prune -f >/dev/null 2>&1 || true

echo "== done =="
