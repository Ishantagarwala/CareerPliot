#!/usr/bin/env bash
# Pull-based deploy: run this on the VPS from a systemd timer.
#
# WHY THIS EXISTS
#
# The host firewalls SSH such that GitHub Actions runners cannot connect
# (`ssh: connect to host ... port 2223: Connection timed out`), so the push
# workflow in .github/workflows/deploy.yml can never reach it. This inverts the
# direction: the server polls the public repo and deploys itself. No inbound
# SSH, no deploy key, no exposed port.
#
# Safety:
#   - flock: overlapping timer runs cannot build on top of each other.
#   - `git reset --hard` deliberately discards local edits; this directory is a
#     deploy target, not a working copy. `.env.production` and `storage/` are
#     gitignored, so they survive.
#   - Nothing is rebuilt unless origin/main actually moved.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/careerpliot}"
LOCK="${LOCK:-/tmp/careerpliot-deploy.lock}"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "another deploy is already running — skipping"
  exit 0
fi

cd "$APP_DIR"

git fetch --quiet origin main
local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/main)"

if [ "$local_sha" = "$remote_sha" ]; then
  echo "up to date at ${local_sha:0:7}"
  exit 0
fi

echo "deploying ${local_sha:0:7} -> ${remote_sha:0:7}"
git reset --hard --quiet origin/main

# deploy.sh lives in the repo, so it is always the version being deployed.
exec "$APP_DIR/scripts/vps/deploy.sh"
