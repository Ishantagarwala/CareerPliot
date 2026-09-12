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
   `LLM_ROUTER_MODEL` (default `zeus/claude-opus-5`), fallback `posiden/deepseek-v4-flash`.
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

---

## 7. Deployment workflow (GitHub Actions + Docker)

Pipeline (`.github/workflows/deploy.yml`):
1. **Trigger**: push to `main` (or manual dispatch), concurrency group
   `deploy-main` (queues, never kills).
2. **Rsync** source to VPS `/opt/careerpliot` (server has **no .git**; excludes
   node_modules/.next/.git/`.env*`/storage — the server's own `.env.production`
   and volumes persist).
3. **Rebuild**: `docker compose up -d --build web`, then
   `docker compose up -d --force-recreate caddy` — **caddy must be
   force-recreated every deploy** (single-file Caddyfile bind mount; a plain
   restart serves stale config).
4. **Smoke**: poll `https://careerpilot.cc/login` until 200 (auth-gated pages
   redirect, so the login page is the reachability probe).

Compose services:
- `storage-init` — creates/chowns upload volumes (runs once).
- `web` — `careerpliot` container, `:3000` internal, `DEMO_MODE=true`,
  `.env.production`, named volumes for public + private uploads.
- `caddy` — TLS + proxy, port 80/443, reads `Caddyfile` (raw-IP redirect uses
  `VPS_IP` from server-side env) + `caddy_data`/`config`.

Secrets required (GitHub Actions): `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`,
`SSH_KNOWN_HOSTS`. Server env in `.env.production` (gitignored).

Manual fallback: `rsync ./ user@host:/opt/careerpliot && docker compose up -d
--build web && docker compose up -d --force-recreate caddy`.

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
