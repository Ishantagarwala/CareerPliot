# CareerPilot — System Workflow

Generative maintenance of the full runtime path: request → auth → data → AI →
deployment. Keep this in sync with the codebase (`git log` history is the
ground truth; this is the mental model on top).

---

## 1. Architecture at a glance

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js 16 (App Router), React 19, TypeScript — **see `node_modules/next/dist/docs/`; this is not stock Next.js** |
| Data | MongoDB via Mongoose (self-hosted in Docker on VPS) |
| Auth | NextAuth v5 (beta) — credentials provider, **JWT sessions** |
| Bot defense | hCaptcha + server-side IP reputation (ProxyCheck) + in-memory rate limiting |
| LLM | Router-first provider chain (see §5) — OpenAI-compatible clients |
| Voice | Sarvam AI (TTS `voice/speak`, STT `voice/transcribe`) |
| PDF | `pdf-parse` v2 (pdf.js) + OCR fallback (`PDF_CO_API_KEY`) |
| UI | Tailwind v4, shadcn/ui (Base UI), `next-themes`, KaTeX/React-Markdown, Sonner |
| Deploy | Docker Compose (web + caddy) on a VPS; GitHub Actions on push to `main` |

Route groups: `(auth)` = login/register; `(dashboard)` = all products. Legacy
`/tutor`, `/pdf`, `/study` redirect to `/ai-hub` (`next.config.ts` redirects) —
AI work has collapsed into the AI Hub.

---

## 2. Request lifecycle (security gate)

1. **Edge middleware** (`middleware.ts`) — Auth.js `edgeAuth` protects
   `/dashboard`, `/career`, `/roadmap`, `/courses`, `/pdf`, `/tutor`,
   `/ai-hub`, `/resume`, `/study`, `/news`, `/profile`, `/jobs`, `/projects`.
   Unauthenticated → 307 to `/login`.
2. **Headers** (`next.config.ts`) — applied to `/:path*`: strict CSP (hCaptcha +
   fonts + YouTube/Unsplash images allowed; `unsafe-eval` only in dev),
   HSTS, `nosniff`, `X-Frame-Options: DENY`, strict-origin Referrer-Policy,
   Permissions-Policy (mic intentionally allowed for voice).
   Keep CSP in sync with any new frontend dep — a forgotten origin breaks
   silently (e.g. captcha never rendering).
3. **Server side** — API route handlers call `dbConnect()` and re-check auth
   via `auth()` (middleware is UI-only and must not be trusted as the sole gate).

---

## 3. Auth flow (login / register)

Flow handled in `lib/auth.ts` (authorize) + `lib/auth.config.ts` (edgeAuth) +
`components/auth/*` (LoginForm, RegisterForm, HCaptchaWidget).

Login order (each can short-circuit, deliberate fail-closed):
1. Reject non-string credentials (blocks NoSQL `$ne` injection).
2. `isAllowedEmailProvider(email)` — email domain allowlist.
3. `assertResidentialIp({ ip, email })` via `getClientIp` — blocks VPN/datacenter
   unless demo or non-strict mode. `TRUST_CF_CONNECTING_IP` makes it trust
   Cloudflare when all traffic proxies.
4. Demo account (`demo@careerpilot.com`) skips steps 5–7 only when
   `DEMO_MODE=true` (compose sets it on the public deploy).
5. `rateLimit('login:<email>', 5, 60_000)` — in-memory, per-email.
6. `requireBotVerification` (hCaptcha token + login ticket); **hard-fail** on
   captcha validator failure / threshold breach.
7. bcrypt compare against `User.findOne().select('+password')`.

Register mirrors this plus `captcha.ts` verification and IP checks; issue
tickets so the app can distinguish bot-blocked from wrong-password for UX.

Session: JWT strategy, no DB session store; `user.id` threaded through
jwt/session callbacks. **Fail-fast**: production refuses to boot without
`AUTH_SECRET` (build phase exempted).

---

## 4. Data model (Mongoose, `models/`)

Core: `User` (hashed password), `UserProfile`, `UserProgress`, `Roadmap`
(+ `roadmap/progress` writes), `ChatHistory`, `Course`, `News` (cached),
`Resume` (with `[id]/analyze`, `[id]/latex`, `[id]/match-jd`),
`CareerRecommendation`, `JobListing` + `Application` (tracker),
`ProjectIdea` + `TeamPost`, `Document` (AI Hub),
`Todo`, `Hackathon`.

Practice: `InterviewSession` (ordered `turns` + one `scorecard`),
`Flashcard` (scheduling fields, unique `user+deck+fingerprint`),
`ReviewLog` (one row per answer, feeds "reviewed today").

The AI Hub has its own objects — `Document` (uploaded PDFs) and threaded
`ChatHistory` — decoupled from legacy tutor history. Uploads: form
multipart → `formidable` → public (`public/uploads`) or private
(`storage/uploads`) storage depending on route (`pdf/upload` = private docs,
`ai-hub/upload` = documents).

---

## 5. LLM provider chain (`lib/llm.ts`)

Providers are resolved **in priority order**, first healthy wins; `chat()`
is wrapped by a shared completion path, non-chat models filtered from the AI
Hub model picker:

1. **Primary router** — `LLM_ROUTER_*` (OpenAI-compatible), flagship
   `LLM_ROUTER_MODEL` (default `zai-org/GLM-5.3-Flash`), fallback `zai-org/GLM-5.3-Flash`. If a configured model is retired, `lib/modelAvailability.ts` falls back to another model the router actually serves.
2. **Local Ollama** — only when `USE_LOCAL_OLLAMA=true`, after the primary router.

Config is skipped when keys are missing or placeholders (`your_*`, `_here`,
`dummy-key`). Models come from `ai-hub/models/route.ts` (filters
whisper/TTS/prompt-guard chat models); the model picker and chat are served
from **all** configured routers.

Consumers: `tutor/chat`, `ai-hub/chat`, `career/*` (assess, recommend),
`resume/ats-analyze`. Prompts live with the routes;
guard rails in `lib/llmGuard.ts`.

---

## 6. Feature workflows

### Career → Roadmap
`career/assess` (assessment form) → `career/recommendations` →
`career/select` pins a direction → `roadmap` builds milestones →
`roadmap/progress` tracks completion. `career/voice-extract` accepts spoken
assessment answers via Sarvam STT.

### AI Hub (unified chat + document + study)
- `ai-hub/threads` (`POST`/`GET`, `[id]`) — conversation storage.
- `ai-hub/upload` — PDF/document ingest (pdf.js; OCR fallback).
- `ai-hub/chat` — streaming chat over the provider chain, can ground on
  uploaded documents (`Document`).
- `ai-hub/models` — router picker.
- UnifiedChat threads chat/voice/study (tutor/pdf/study all funnel here).

### Voice (AI Hub)
`voice/transcribe` (Sarvam STT) + `voice/speak` (Sarvam TTS, base64 WAV played
via `data:` — must stay in CSP `media-src data:`). `useVoice.ts` + `VoiceHUD`.

### Resume
`resume` CRUD → `resume/[id]/analyze` → `resume/ats-analyze` (ATS score) →
`resume/[id]/match-jd` → `resume/[id]/latex` export. Builder + ATS card in UI.

### Jobs / Projects / News
`jobs` (multi-provider: Rapidd/Adzuna/LLM) + `jobs/applications` tracker.
`projects` + `projects/teams` (collab posts). `news` cached via `newsFetcher`.

### Mock interview
`POST /api/interview` creates a session and writes the opening question
locally (`buildOpeningQuestion`) — no model call, so starting never fails.
`POST /api/interview/[id]/turn` asks the provider for
`{acknowledgement, question}` and writes BOTH turns only after the call
succeeds, so a provider failure leaves the session untouched and a retry
cannot duplicate the answer. The final answer gets a fixed closing line
instead of a model call. `POST /api/interview/[id]/finish` scores the
transcript once and is idempotent thereafter — retrying returns the stored
report rather than paying for a second, different one. Normalisation lives in
`lib/interview.ts`; the UI is `components/interview/*`.

### Flashcards
`flashcards/generate` samples passages across the whole document
(`splitIntoPassages` + an even sample), asks for cards, and inserts only the
ones whose `cardKey(front)` is not already in the deck. `flashcards/review`
accepts a rating only — never an interval — and applies `lib/srs.ts`, then
writes a `ReviewLog`. `flashcards` returns per-deck counts and, with `?due=1`,
the cross-deck queue. "Again" requeues the card client-side at the end of the
session, because a 20-card review finishes long before the 10-minute relearn
interval elapses. The dashboard reads the due count through `progress`.

---

## 7. Deployment workflow (image-based: CI builds, VPS pulls)

The VPS host has 2.5 GB RAM and no swap, so it cannot build and serve at the
same time — the old build-on-host flow paused the app for ~6 minutes per
deploy. The build now runs on GitHub Actions and the VPS only swaps containers
(~15 s downtime).

Pipeline (`.github/workflows/build-image.yml`):
1. **Trigger**: push to `main` (paths-ignore: docs, CI, deploy scripts,
   mockups) or manual dispatch; concurrency `build-image-main` (cancels
   superseded builds).
2. **Build & push**: `docker build` (the repo Dockerfile, on a runner with
   plenty of RAM) → `ghcr.io/ishantagarwala/careerpliot` tagged `main` and
   `main-<sha>`; layer cache via the Actions cache. Build args:
   `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_HCAPTCHA_SITE_KEY`, `GIT_SHA`
   (stamped as an image label). Runtime secrets stay in the server's
   `.env.production` — never baked into the image.
3. **Pull & swap**: the systemd timer on the VPS (1 min) runs
   `scripts/vps/pull-deploy.sh` — `docker pull` (no-op when unchanged),
   compare image IDs, stop old → start new → smoke-check
   `http://127.0.0.1:3000/login`. On smoke failure it restarts the previous
   image (rollback) and records the bad image in `.last-failed-image` so the
   timer does not retry it in a loop.
4. **Housekeeping**: the two newest images are kept on disk; older ones pruned.

RAM controls (all env-overridable in `pull-deploy.sh`): container hard cap
`APP_MEM=900m`, soft reservation `APP_MEM_RESERVATION=700m`, V8 heap ceiling
`NODE_HEAP_MB=700` (set via `NODE_OPTIONS` so Node GCs before the cgroup
OOM-kills it). Host layout: provider Apache owns 80/443 and proxies to
`127.0.0.1:3000`; `/opt/careerpliot` holds only `.env.production` and
`storage/uploads/`.

The GHCR package starts **private** — flip it to public once (or
`docker login` on the host with a read-only PAT). GHCR runners cannot SSH to
this host (firewall), which is why the VPS pulls instead of being pushed to.

`docker-compose.yml` (web + caddy) remains for hosts where you self-manage
TLS; the rapidseedbox VPS does not use it.

### Split mode (optional): Vercel frontend + VPS API

Every page is a client shell, so the deployment can be split without touching
the API code. `rewrites()` in `next.config.ts` forwards `/api/*` to
`BACKEND_ORIGIN` **before filesystem routes**, so the local handlers are
bypassed rather than shadowing the proxy. `/api/auth/*` is deliberately not
forwarded: Auth.js must issue the cookie from the host the browser is on, and
proxying it would break CSRF and the `__Secure-` cookie scope.

Both deployments share `AUTH_SECRET`; the VPS verifies the forwarded cookie.
`/api/auth/mobile/*` therefore stays on the frontend, which needs Mongo and the
Play Integrity keys too. **The VPS must never define `BACKEND_ORIGIN`** — that
would rewrite its own API to itself. A new API directory must be added to
`BACKEND_API_PREFIXES` or it will run on Vercel, where uploads cannot be
written to disk.

Alternative host: Cloudflare Workers via `@opennextjs/cloudflare`
(`npm run preview/deploy` + `wrangler.jsonc`), storage via bindings.

---

## 8. Conventions & invariants

- **CSP is hand-maintained** — add every new external origin here or it fails
  silently in prod. Keep dev-only `unsafe-eval` gated on `NODE_ENV`.
- **Auth is fail-closed** — no AUTH_SECRET in prod = boot error; captcha / IP /
  rate-limit failures reject by default; `DEMO_MODE` is opt-in per deployment.
- **LLM secrets are placeholder-checked** — missing/placeholder keys silently
  drop that provider from the chain rather than erroring.
- **Secrets never in the repo** — `.env*`, `storage`, real IPs are gitignored;
  CI gets values from GitHub secrets; server gets them from `.env.production`.
- **No co-authored-by footers** on commits.
- **This is not stock Next.js** — consult `node_modules/next/dist/docs/` before
  writing framework code.
