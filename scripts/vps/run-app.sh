#!/usr/bin/env bash
# (Re)create the CareerPilot app container on the rapidseedbox host.
#
# Docker is used only as a Node 22 runtime here: the provider owns ports 80/443
# (Apache), so the app publishes on loopback and Apache's zz-api.careerpilot.cc
# vhost proxies to it. Memory is capped because the host has 2.5 GB and runs
# provider services that must not be disturbed.
set -euo pipefail

APP_DIR=/opt/careerpliot
docker rm -f careerpliot >/dev/null 2>&1 || true
mkdir -p "$APP_DIR/storage/uploads"

docker run -d --name careerpliot --restart unless-stopped \
  --memory=900m --memory-swap=900m \
  -p 127.0.0.1:3000:3000 \
  -u 1000:1000 -e HOME=/tmp \
  -v "$APP_DIR":/app -w /app \
  --env-file "$APP_DIR/.env.production" \
  -e NODE_ENV=production -e HOSTNAME=0.0.0.0 -e PORT=3000 \
  -e AUTH_TRUST_HOST=true \
  -e AUTH_URL=https://careerpilot.cc -e NEXTAUTH_URL=https://careerpilot.cc \
  -e NEXT_PUBLIC_SITE_URL=https://careerpilot.cc -e DEMO_MODE=true \
  node:22-bookworm-slim npm start >/dev/null

echo "container started"
