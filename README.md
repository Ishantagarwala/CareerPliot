# 🚀 Career Pilot — AI Career Guidance, Learning & Job Platform

[![Brainware AI Hackathon 2026](https://img.shields.io/badge/Brainware%20AI%20Hackathon-2026-blueviolet?style=for-the-badge)](https://github.com/aritraio/bwu-ai-hackathon-2026)
[![Made By](https://img.shields.io/badge/Made%20By-Career%20Wallah-orange?style=for-the-badge)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20React%2019%20%7C%20MongoDB-blue?style=for-the-badge)](#-tech-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

Welcome to the official repository for **Career Pilot**, an AI-powered career guidance and personalized learning assistant developed by **Career Wallah** for the **Brainware AI Hackathon 2026**.

Career Pilot reduces uncertainty in career planning for students. It combines career assessment, generated roadmaps, live course and job discovery, document-aware tutoring, resume building, HackerRank-inspired resume scoring, and progress tracking in one responsive platform.

The interface uses a light-first neo-brutalist design, supports dark mode, includes a user-selectable accent color, responsive hamburger navigation, resilient image fallbacks, and visible loading states during route transitions and data fetches.

**Production:** [careerpilot.cc](https://careerpilot.cc)

The production VPS exposes an opt-in shared demo through **Demo Login**. Do not enter private information in the shared demo account.

---

## 📌 Table of Contents
1. [Core Features](#-core-features)
2. [System Architecture](#-system-architecture)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Getting Started & Setup](#-getting-started--setup)
6. [Environment Variables](#-environment-variables)
7. [Deployment](#-deployment)
8. [Available Scripts](#-available-scripts)
9. [Team](#-team)

---

## 🌟 Core Features

* **🧭 AI Career Discovery:** Assesses interests, academic preferences, existing skills, and goals to recommend compatible career paths.
* **🗺️ Personalized Roadmaps:** Generates Beginner → Intermediate → Advanced milestones and tracks completion and readiness.
* **📚 Live Course Recommendations:** Uses roadmap milestones to find relevant Coursera catalog courses, optional long-form YouTube results, and provider search links.
* **📄 AI Study Hub:** Upload PDFs, extract text locally, summarize documents, generate questions, and chat with selected documents. Replies stream token-by-token. Uploaded documents can also be deleted from the library.
* **🤖 Context-Aware AI Tutor:** Supports general tutoring, document-aware questions, code help, attachments, persistent threads, and renamed conversations.
* **🧠 Router Model Selection:** Loads the models exposed by the configured OpenAI-compatible router, removes duplicate provider variants, and lets users choose a model in the AI Hub.
* **📝 Resume Builder:** Builds printable resumes with personal details, education, experience, projects, skills, certifications, custom sections, LaTeX export, and reliable comma-separated skill/technology entry.
* **🎯 Resume Score:** Uses a HackerRank hiring-agent-inspired rubric (open source, self-projects, production impact, technical skills, bonuses, and deductions) with a score out of 120.
* **🔎 Job Description Matching:** Keeps job-description keyword matching separate from the general resume score.
* **💼 Live Job Board:** Aggregates Remotive, Arbeitnow, and RemoteOK without API keys, with optional Adzuna and JSearch/RapidAPI results (including LinkedIn/Indeed/Glassdoor-sourced listings).
* **📌 Application Tracker:** Saves live jobs, adds custom opportunities, and moves applications through saved, applied, screening, interview, offer, and archived stages.
* **🏆 Projects & Hackathons:** Surfaces project ideas, hackathon opportunities, and team collaboration posts.
* **📰 Tech News:** Aggregates India-focused technology, hiring, startup, funding, cloud, and cybersecurity RSS feeds with MongoDB caching.
* **📊 Progress Dashboard:** Tracks roadmap milestones, completed courses, analyzed documents, tutor sessions, readiness, and study streaks.
* **🔐 Hardened Credential Auth:** Uses Auth.js sessions, hCaptcha, consumer-email validation, login throttling, and VPN/datacenter IP checks.
* **⚡ Opt-in Demo Login:** Creates the shared demo user and idempotently seeds its dashboard data when `DEMO_MODE=true`.
* **🎨 Accessible UI:** Light mode by default, optional dark mode, persistent accent-color picker, responsive hamburger drawers, full-width dashboard layouts, and branded loading animations.

---

## 🏗️ System Architecture

```text
Browser
  └─ Next.js 16 App Router + React 19 + Tailwind CSS 4
       ├─ Public landing and Auth.js credential flows
       │    (hCaptcha + IP reputation; optional demo login)
       ├─ Protected dashboard pages and client-side data fetching
       └─ Route handlers under app/api
            ├─ MongoDB Atlas / Mongoose
            │    users, profiles, roadmaps, progress, resumes,
            │    documents, chat threads, applications and cached news
            ├─ OpenAI-compatible LLM router
            │    LLM_ROUTER_BASE_URL + API key (streaming AI Hub chat)
            ├─ PDF extraction
            │    pdf-parse locally; optional PDF.co OCR fallback
            └─ External providers
                 jobs, courses, YouTube and RSS news feeds

Production VPS
  └─ Caddy (HTTPS + reverse proxy)
       └─ Docker Compose
            └─ Next.js Node container
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description / Use Case |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3 + React 19.2** | App Router pages, server/client components, route handlers, and streaming loading boundaries |
| **UI Styling** | **Tailwind CSS 4 + shadcn/ui** | Utility-first responsive design coupled with modern, accessible UI components |
| **Database** | **MongoDB (Atlas)** | Document-based flexible cloud database ideal for rapid feature expansion |
| **ODM** | **Mongoose 9.9** | Schema validation and structured MongoDB queries |
| **Auth** | **NextAuth.js (Auth.js v5)** | Session management, credential login, CSRF protection, and middleware route security |
| **Auth protection** | **hCaptcha + IP reputation checks** | Bot, VPN, proxy, and datacenter-network protection for login and registration |
| **AI Engine** | **Custom LLM router** | OpenAI-compatible gateway (`LLM_ROUTER_*`) with flagship + fallback models |
| **PDF Extraction** | **pdf-parse + optional PDF.co** | Local serverless-compatible extraction with OCR fallback |
| **Job Providers** | **Remotive, Arbeitnow, RemoteOK, Adzuna, JSearch** | Multi-source live jobs with optional premium providers |
| **Course Providers** | **Coursera + YouTube Data API** | Roadmap-driven live recommendations and provider deep links |
| **News Sources** | **RSS feeds + optional GNews** | Cached domain-aware technology, career, startup, and hiring news |
| **Production Hosting** | **Docker Compose + Caddy** | Node.js container behind automatic HTTPS and reverse proxying on the VPS |
| **Alternative Hosting** | **Vercel or OpenNext Cloudflare** | Serverless deployment paths included in the repository |

---

## 📂 Project Structure

```
CareerPliot/
├── app/
│   ├── (auth)/                   # Login and registration
│   ├── (dashboard)/              # Protected application pages
│   └── api/                      # Route handlers
├── components/
│   ├── ai-hub/                   # Document library and unified chat
│   ├── auth/                     # Login/register + hCaptcha
│   ├── career/                   # Assessment and recommendations
│   ├── courses/                  # Filters and course cards
│   ├── dashboard/                # Metrics and streak widgets
│   ├── layout/                   # App shell, drawers, theme/accent UI
│   ├── pdf/                      # Upload, summary and quiz UI
│   ├── resume/                   # Builder, preview, ATS and JD matching
│   ├── roadmap/                  # Roadmap viewer and milestones
│   ├── security/                 # Cloudflare bot guard preload
│   ├── tutor/                    # Chat interface and message rendering
│   └── ui/                       # Shared UI primitives
├── lib/                          # Auth, DB, LLM router, PDF and providers
├── models/                       # Mongoose models
├── public/                       # Static assets and upload mount point
├── storage/                      # Private upload storage mount point
├── Dockerfile                    # Multi-stage Node.js production image
├── docker-compose.yml            # Next.js + Caddy VPS services
├── Caddyfile                     # HTTPS, redirects, and reverse proxy
├── open-next.config.ts           # OpenNext Cloudflare adapter config
├── wrangler.jsonc                # Cloudflare Worker config
└── middleware.ts                 # Protected-route middleware
```

---

## ⚡ Getting Started & Setup

### Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) 22 recommended (Node.js 20.9+ is the minimum for Next.js 16)
* [MongoDB Atlas](https://www.mongodb.com/atlas) (or local MongoDB server instance)
* An OpenAI-compatible LLM router (API key + base URL)

### Installation & Run

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/Ishantagarwala/CareerPliot.git
   cd CareerPliot
   ```

2. Install the project dependencies:
   ```bash
   npm ci
   ```

3. Copy the environment template and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

   Minimum configuration:
   ```env
   AUTH_SECRET=your_auth_secret_here
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/careerpilot

   LLM_ROUTER_API_KEY=your_router_api_key
   LLM_ROUTER_BASE_URL=https://your-router.example.com/v1
   LLM_ROUTER_MODEL=zeus/claude-opus-5
   LLM_ROUTER_FALLBACK_MODEL=posiden/deepseek-v4-flash

   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Generate an Auth.js secret with:
   ```bash
   openssl rand -base64 32
   ```

   Registration and login only accept **Gmail, iCloud, Yahoo, and Outlook/Hotmail** addresses. Datacenter and VPN IPs are blocked via IP reputation lookups (ipapi.is / ip-api.com, optional ProxyCheck). Demo login is exempt. Localhost / private IPs are allowed for development.

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔧 Environment Variables

Start from `.env.example`. Keep all real values in an ignored environment file or in your hosting provider's secret store.

### Required application variables

| Variable | Purpose |
| :--- | :--- |
| `AUTH_SECRET` | Auth.js session and login-ticket signing secret |
| `MONGODB_URI` | MongoDB connection string |
| `LLM_ROUTER_API_KEY` | API key for the OpenAI-compatible LLM router |
| `LLM_ROUTER_BASE_URL` | Router base URL, normally ending in `/v1` |
| `LLM_ROUTER_MODEL` | Primary model used for general generation |
| `LLM_ROUTER_FALLBACK_MODEL` | Fallback model and preferred PDF model |
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin; use `http://localhost:3000` locally |

### Optional integrations and controls

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha on production login and registration |
| `PROXYCHECK_API_KEY` | Adds ProxyCheck to VPN/datacenter IP detection |
| `IP_REPUTATION_STRICT=true` | Fails authentication closed when all reputation lookups fail |
| `DISABLE_REGISTRATION=true` | Emergency registration kill switch; an enabled demo account remains available |
| `TRUST_CF_CONNECTING_IP=true` | Trusts `CF-Connecting-IP`; set only when all public traffic passes through Cloudflare |
| `DEMO_MODE=true` | Enables shared demo login and its production seed path |
| `DEMO_EMAIL` | Overrides the default `demo@careerpilot.com` demo address |
| `SEED_SECRET` | Authorizes production seeding for non-demo accounts through `x-seed-secret` |
| `YOUTUBE_API_KEY` | Live long-form YouTube course results |
| `SARVAM_AI_API_KEY` | Voice transcription and speech in the AI Hub |
| `RAPIDAPI_KEY` | JSearch jobs, including listings sourced from major job boards |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Adzuna job listings |
| `GNEWS_API_KEY` | Optional GNews articles in the news feed |
| `PDF_CO_API_KEY` | OCR fallback for scanned PDFs |
| `LLM_ROUTER_JSON_MODE=true` | Requests router-native JSON response format; off by default for compatibility |
| `LLM_MAX_TOKENS` | Structured-generation completion ceiling; defaults to `12000` |
| `LLM_USER_HOURLY_LIMIT` | Per-user hourly AI Hub request limit; defaults to `25` |
| `USE_LOCAL_OLLAMA=true` | Adds the configured local Ollama model after router fallbacks |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` / `OLLAMA_FALLBACK_MODEL` | Optional Ollama endpoint and model IDs |
| `OLAMA_ROUTER_API_KEY` / `_BASE_URL` / `_MODEL` / `_FALLBACK_MODEL` | Optional second OpenAI-compatible router (e.g. Groq); tried between the main router and local Ollama. Correctly spelled `OLLAMA_ROUTER_*` variants are also accepted |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console verification token |

> `DEMO_MODE` bypasses captcha and IP checks for one shared account. Enable it only when that trade-off is intentional, and never store personal or confidential data in the demo account.

---

## 🚢 Deployment

### Production VPS with Docker Compose

The checked-in production setup runs the Next.js server in Docker behind Caddy. The compose file is configured for `careerpilot.cc` and explicitly enables the shared demo.

1. Install Docker Engine and the Docker Compose plugin on the server.
2. Place the repository at `/opt/careerpliot`.
3. Create two ignored server-side files:
   * `.env.production` — application runtime secrets such as `AUTH_SECRET`, `MONGODB_URI`, and the LLM variables.
   * `.env` — Compose interpolation/build values such as:

     ```env
     VPS_IP=203.0.113.10
     NEXT_PUBLIC_SITE_URL=https://careerpilot.cc
     NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_public_site_key
     ```

   `NEXT_PUBLIC_*` values must be present during the image build. The Docker build intentionally excludes `.env.production`.
4. Review `Caddyfile` and the fixed domain/Auth.js URLs in `docker-compose.yml` if deploying under another hostname.
5. Build and start the services:

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

6. Verify the public login page:

   ```bash
   curl -I https://careerpilot.cc/login
   ```

Persistent Docker volumes retain public uploads, private uploads, and Caddy certificates/configuration.

#### Automatic VPS deployment

`.github/workflows/deploy.yml` deploys every push to `main` by rsyncing the source to `/opt/careerpliot`, rebuilding `web`, recreating `caddy`, and smoke-checking the login page. Configure these GitHub Actions secrets:

| Secret | Purpose |
| :--- | :--- |
| `SSH_PRIVATE_KEY` | Private deploy key authorized on the VPS |
| `SSH_HOST` | VPS hostname or IP address |
| `SSH_USER` | Remote deployment user |
| `SSH_KNOWN_HOSTS` | Pinned SSH host-key line |

The workflow deliberately excludes `.env*`, `.git`, build artifacts, dependencies, and server-side storage from rsync.

### Vercel

1. Import this GitHub repository into Vercel.
2. Add all required variables from the table above under **Project Settings → Environment Variables**.
3. Add both hCaptcha variables and any optional integrations needed by the deployment.
4. Deploy. The PDF worker is statically bundled for Vercel serverless compatibility.

### OpenNext on Cloudflare

The repository includes `open-next.config.ts` and `wrangler.jsonc`:

```bash
npm run preview  # build and preview locally
npm run deploy   # build and deploy the Worker
npm run upload   # build and upload without deploying
```

Configure secrets and environment values in Cloudflare before deploying. Confirm MongoDB, the LLM router, and all other external services permit connections from the Workers runtime.

> Never commit `.env`, `.env.local`, `.env.production`, deploy keys, or real credentials.

---

## 📜 Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Start the local Next.js development server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Run the built Next.js Node server |
| `npm run lint` | Run ESLint |
| `npm run preview` | Build and preview with OpenNext Cloudflare |
| `npm run deploy` | Build and deploy with OpenNext Cloudflare |
| `npm run upload` | Build and upload the Cloudflare Worker |
| `npm run cf-typegen` | Generate Cloudflare environment types |

---

## 👥 Team

### Developed by Career Wallah
* **Sujoy Singha** — Team Leader, Full-Stack & Presentation Lead
* **Aritra Saha** — Backend & DevOps
* **Ishant Agarwala** — AI Engineer & UI/UX
* **Avik Singha Roy** — Database Administrator
* **Prathama Roy** — Presenter
