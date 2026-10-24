# VPS deployment (rapidseedbox host)

Scripts for the server that runs the API behind `api.careerpilot.cc`. The
frontend lives on Vercel and proxies `/api/*` here.

## How deploys work now (image-based)

The host cannot build and serve at the same time — 2.5 GB RAM, no swap, and a
Next.js build peaks near 1.8 GB — so the old flow paused the app for a
~6-minute on-host build on every deploy. The build now happens elsewhere:

```
push to main ──► GitHub Actions builds the Docker image
                     │  (runner with plenty of RAM; same Dockerfile)
                     ▼
             ghcr.io/ishantagarwala/careerpliot:main
                     │
   systemd timer (1 min) on the VPS: docker pull
                     │  unchanged → no-op; changed ↓
                     ▼
   stop old container ─► start new one ─► smoke-check /login
                     │                         │
                     │ ok                      │ failed
                     ▼                         ▼
              ~15 s downtime        restart previous image (rollback)
```

- **Downtime per deploy: ~15 seconds** (was ~6 minutes).
- **The VPS never builds again** — the 1.8 GB build spike is gone from this
  host entirely, which is most of the RAM story.
- The image is amd64; this host is x86_64 (and the pdf.js native canvas
  dependency has no arm64 build). `uname -m` should say `x86_64`.
- Only the two newest images are kept on disk; older ones are pruned
  automatically by `pull-deploy.sh`.

## RAM management

| Control | Value | Where |
|---|---|---|
| Container hard cap (`--memory`) | 900 MB | `pull-deploy.sh` (`APP_MEM`) |
| Soft reservation (`--memory-reservation`) | 700 MB | `pull-deploy.sh` (`APP_MEM_RESERVATION`) |
| V8 heap ceiling (`--max-old-space-size`) | 700 MB | `pull-deploy.sh` (`NODE_HEAP_MB`) |

The heap ceiling sits below the cgroup cap on purpose: Node garbage-collects
under pressure instead of being OOM-killed at the cap. Watch live usage with:

```bash
docker stats careerpliot          # live RAM vs the 900m cap
docker inspect careerpliot        # see Health + restart count
```

If the app ever approaches the cap, lower the workload knobs first (they are
env vars at the top of `pull-deploy.sh` — no script edit needed), redeploy with
`--force`, and only then consider raising `APP_MEM`. The host also runs the
provider's services, so the 900 m cap is not free headroom to grow into.

## First-time setup

1. **Publish the image**: push to `main` (or run the *Build and publish image*
   workflow manually). This creates the GHCR package.
2. **Make the package public** (one-time): GitHub → your profile → **Packages**
   → `careerpliot` → *Package settings* → *Change visibility* → **Public**.
   New GHCR packages are private by default; until this is done the VPS pull
   fails with `denied`. (Prefer private? `docker login ghcr.io` on the host
   with a read-only fine-grained PAT that has `packages:read` instead.)
3. **Install the deploy script and units** (as root):

   ```bash
   sudo mkdir -p /opt/careerpliot-deploy
   sudo cp scripts/vps/pull-deploy.sh /opt/careerpliot-deploy/pull-deploy.sh
   sudo chmod +x /opt/careerpliot-deploy/pull-deploy.sh
   sudo cp scripts/vps/careerpliot-deploy.{service,timer} /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now careerpliot-deploy.timer
   ```

4. **Verify**: within a minute, `journalctl -u careerpliot-deploy.service -n 20`
   should show the pull and the container swap, and
   `curl -sf http://127.0.0.1:3000/login` should succeed.

`/opt/careerpliot` keeps only what the image does not contain: `.env.production`
(runtime secrets — never baked into the image) and `storage/uploads/`
(user files on disk). The git checkout there is no longer used for deploys.

### After the first successful image deploy (optional cleanup)

The pre-image deployment built in place, so `/opt/careerpliot` still holds a
`node_modules/` and `.next/` (~1 GB). Keep them until you are confident in the
new flow — they are what the old container ran from — then:

```bash
cd /opt/careerpliot && rm -rf node_modules .next .next.bak
```

## Day-2 operations

```bash
# force a container recreate with the current image (e.g. after editing
# .env.production) — also retries an image the deploy script rejected
sudo /opt/careerpliot-deploy/pull-deploy.sh --force

# plain restart (same image, same everything)
docker restart careerpliot

# logs
docker logs careerpliot --tail 100 -f
journalctl -u careerpliot-deploy.service -n 50 --no-pager

# what revision is running
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' careerpliot

# manual rollback: the previous image is still on disk (one of the two kept)
docker images ghcr.io/ishantagarwala/careerpliot
sudo /opt/careerpliot-deploy/pull-deploy.sh --force   # after a fix lands
```

Automatic rollback: if a freshly swapped container fails the smoke check,
`pull-deploy.sh` restarts the previous image and records the bad image in
`/opt/careerpliot/.last-failed-image` so the timer does not retry it in a loop.
A newer image on `main` (or `--force`) clears that.

## Troubleshooting

- **`docker pull` denied** — the GHCR package is still private; see setup step 2.
- **Container starts then dies instantly** — `docker logs careerpliot`. If the
  error mentions `exec format error`, the host is not x86_64 and the image
  cannot run here.
- **Smoke check failing repeatedly** — the script rolls back and stops retrying
  that image; check `docker logs`, fix on `main`, push. CI builds a new image
  and the next timer tick deploys it.
- **Disk filling up** — `docker images` should show at most two `careerpliot`
  tags plus `node:22-bookworm-slim` (kept for pre-image rollback; delete it
  once the new flow is proven).

## Why not build on the VPS (any more)?

Turbopack builds are OOM-killed on this host; the webpack low-memory profile
fit only with the app stopped, which is where the 6-minute downtime came from.
Moving the build to GitHub Actions fixed the downtime and removed the largest
RAM consumer this host ever ran. The runner cannot SSH in (host firewall), so
the VPS keeps pulling — the same direction as before, just artifacts instead
of source.
