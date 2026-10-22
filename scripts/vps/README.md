# VPS deployment (rapidseedbox host)

Scripts for the server that runs the API behind `api.careerpilot.cc`. The
frontend lives on Vercel and proxies `/api/*` here.

## The host is unusual — read this first

* **2.5 GB RAM, 2 cores, no swap.** `swapon` is refused by the container stack,
  and a default build is OOM-killed at ~1.8 GB. `deploy.sh` uses
  `next build --webpack` with `NEXT_BUILD_LOW_MEMORY=1`; that fits.
* **Ports 80/443 belong to the provider's Apache**, not to this project. The app
  publishes on `127.0.0.1:3000` and the `zz-api.careerpilot.cc` vhost proxies to
  it. Never start the repo's Caddy service here.
* **Docker is only a Node runtime.** `run-app.sh` mounts the repo and runs
  `npm start`; it is not a multi-stage image build.
* **Uploads** land in `storage/uploads` on this disk. Vercel cannot write files,
  which is the reason the API lives here at all.

## Deploying

Two paths, both ending in the same commands:

**Pull-based (automatic).** `careerpliot-deploy.timer` runs `pull-deploy.sh`
every five minutes. It fetches `origin/main`, and if the SHA moved, resets the
checkout and runs `deploy.sh`. Installed to `/opt/careerpliot-deploy/` with the
units in `/etc/systemd/system/`.

```bash
systemctl list-timers careerpliot-deploy.timer
journalctl -u careerpliot-deploy.service -n 50 --no-pager
sudo systemctl start careerpliot-deploy.service   # deploy now
```

**Manual.**

```bash
/opt/careerpliot/scripts/vps/deploy.sh
```

## Why not GitHub Actions?

`.github/workflows/deploy.yml` still exists and is correct, but GitHub's runners
cannot reach this host: `ssh: connect to host … port 2223: Connection timed
out`. The pull timer exists so pushes still reach production without opening the
SSH port to the internet.

## Failure behaviour

`deploy.sh` builds before it restarts anything. A failed build leaves the
previous container running, so a bad commit cannot take the API down — the timer
simply retries on the next tick.

## First-time setup

```bash
sudo cp scripts/vps/pull-deploy.sh /opt/careerpliot-deploy/pull-deploy.sh
sudo chmod +x /opt/careerpliot-deploy/pull-deploy.sh
sudo cp scripts/vps/careerpliot-deploy.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now careerpliot-deploy.timer
```
