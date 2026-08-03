# 🚀 Career Pilot — AI Career Guidance, Learning & Job Platform

[![Brainware AI Hackathon 2026](https://img.shields.io/badge/Brainware%20AI%20Hackathon-2026-blueviolet?style=for-the-badge)](https://github.com/aritraio/bwu-ai-hackathon-2026)
[![Made By](https://img.shields.io/badge/Made%20By-Career%20Wallah-orange?style=for-the-badge)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%2016%20%7C%20React%2019%20%7C%20MongoDB-blue?style=for-the-badge)](#-tech-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

Welcome to the official repository for **Career Pilot**, an AI-powered career guidance and personalized learning assistant developed by **Career Wallah** for the **Brainware AI Hackathon 2026**.

Career Pilot reduces uncertainty in career planning for students. It combines career assessment, generated roadmaps, live course and job discovery, document-aware tutoring, resume building, HackerRank-inspired resume scoring, and progress tracking in one responsive platform.

The interface uses a light-first neo-brutalist design, supports dark mode, includes a user-selectable accent color, responsive hamburger navigation, resilient image fallbacks, and visible loading states during route transitions and data fetches.

---

## 📌 Table of Contents
1. [Core Features](#-core-features)
2. [System Architecture](#-system-architecture)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Getting Started & Setup](#-getting-started--setup)
6. [Team](#-team)

---

## 🌟 Core Features

* **🧭 AI Career Discovery:** Assesses interests, academic preferences, existing skills, and goals to recommend compatible career paths.
* **🗺️ Personalized Roadmaps:** Generates Beginner → Intermediate → Advanced milestones and tracks completion and readiness.
* **📚 Live Course Recommendations:** Uses roadmap milestones to find relevant Coursera catalog courses, optional long-form YouTube results, and provider search links.
* **📄 AI Study Hub:** Upload PDFs, extract text locally, summarize documents, generate questions, and chat with selected documents. Replies stream token-by-token. Uploaded documents can also be deleted from the library.
* **🤖 Context-Aware AI Tutor:** Supports general tutoring, document-aware questions, code help, attachments, persistent threads, and renamed conversations.
* **📝 Resume Builder:** Builds printable resumes with personal details, education, experience, projects, skills, certifications, custom sections, LaTeX export, and reliable comma-separated skill/technology entry.
* **🎯 Resume Score:** Uses a HackerRank hiring-agent-inspired rubric (open source, self-projects, production impact, technical skills, bonuses, and deductions) with a score out of 120.
* **🔎 Job Description Matching:** Keeps job-description keyword matching separate from the general resume score.
* **💼 Live Job Board:** Aggregates Remotive, Arbeitnow, and RemoteOK without API keys, with optional Adzuna and JSearch/RapidAPI results (including LinkedIn/Indeed/Glassdoor-sourced listings).
* **📌 Application Tracker:** Saves live jobs, adds custom opportunities, and moves applications through saved, applied, screening, interview, offer, and archived stages.
* **🏆 Projects & Hackathons:** Surfaces project ideas, hackathon opportunities, and team collaboration posts.
* **📰 Tech News:** Aggregates India-focused technology, hiring, startup, funding, cloud, and cybersecurity RSS feeds with MongoDB caching.
* **📊 Progress Dashboard:** Tracks roadmap milestones, completed courses, analyzed documents, tutor sessions, readiness, and study streaks.
* **🎨 Accessible UI:** Light mode by default, optional dark mode, persistent accent-color picker, responsive hamburger drawers, full-width dashboard layouts, and branded loading animations.

---

## 🏗️ System Architecture

```text
Browser
  └─ Next.js 16 App Router + React 19 + Tailwind CSS 4
       ├─ Public landing and Auth.js credential flows
       │    (hCaptcha on login/register)
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
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description / Use Case |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.2 + React 19** | App Router pages, server/client components, route handlers, and streaming loading boundaries |
| **UI Styling** | **Tailwind CSS 4 + shadcn/ui** | Utility-first responsive design coupled with modern, accessible UI components |
| **Database** | **MongoDB (Atlas)** | Document-based flexible cloud database ideal for rapid feature expansion |
| **ODM** | **Mongoose 9** | Schema validation and structured MongoDB queries |
| **Auth** | **NextAuth.js (Auth.js v5)** | Session management, credential login, CSRF protection, and middleware route security |
| **Bot protection** | **hCaptcha** | Challenge / passive verification on login and registration |
| **AI Engine** | **Custom LLM router** | OpenAI-compatible gateway (`LLM_ROUTER_*`) with flagship + fallback models |
| **PDF Extraction** | **pdf-parse + optional PDF.co** | Local serverless-compatible extraction with OCR fallback |
| **Job Providers** | **Remotive, Arbeitnow, RemoteOK, Adzuna, JSearch** | Multi-source live jobs with optional premium providers |
| **Course Providers** | **Coursera + YouTube Data API** | Roadmap-driven live recommendations and provider deep links |
| **News Sources** | **TechCrunch, Inc42, YourStory, Entrackr, Moneycontrol, Livemint and more** | Cached technology and hiring RSS feeds |

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
├── public/                       # Static assets (logo)
└── middleware.ts                 # Protected-route middleware
```

---

## ⚡ Getting Started & Setup

### Prerequisites
Make sure you have the following installed:
* [Node.js](https://nodejs.org/) 20+ recommended
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
   npm install
   ```

3. Copy the environment template and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

   Minimum configuration:
    ```env
    AUTH_SECRET=your_auth_secret_here
    MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/careerpilot

    # OpenAI-compatible LLM router (required)
    LLM_ROUTER_API_KEY=your_router_api_key
    LLM_ROUTER_BASE_URL=https://your-router.example.com/v1
    LLM_ROUTER_MODEL=zeus/claude-opus-5
    LLM_ROUTER_PDF_MODEL=posiden/deepseek-v4-flash
    LLM_ROUTER_FALLBACK_MODEL=posiden/deepseek-v4-flash
    NEXT_PUBLIC_LLM_ROUTER_MODEL=zeus/claude-opus-5
    ```

   Generate an Auth.js secret with:
   ```bash
   openssl rand -base64 32
   ```

   Optional integrations:

   | Variable | Purpose |
   | :--- | :--- |
   | `NEXT_PUBLIC_SITE_URL` | Canonical URL — use `https://www.careerpilot.cc` |
   | `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` / `HCAPTCHA_SECRET_KEY` | hCaptcha bot verification on auth |
   | `PDF_CO_API_KEY` | OCR fallback for scanned/image-only PDFs |
   | `YOUTUBE_API_KEY` | Long-form YouTube course recommendations |
   | `RAPIDAPI_KEY` | JSearch jobs sourced from LinkedIn, Indeed and Glassdoor |
   | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Adzuna job listings |

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Deployment on Vercel

1. Import this GitHub repository into Vercel.
2. Add `AUTH_SECRET`, `MONGODB_URI`, `LLM_ROUTER_API_KEY`, and `LLM_ROUTER_BASE_URL` under **Project Settings → Environment Variables**.
3. Add optional keys (`YOUTUBE_API_KEY`, hCaptcha, etc.) as needed.
4. Deploy. The PDF worker is statically bundled for Vercel serverless compatibility.

> Never commit `.env.local` or real credentials.

---

## 👥 Team

### Developed by Career Wallah
* **Sujoy Singha** — Team Leader, Full-Stack & Presentation Lead
* **Aritra Saha** — Backend & DevOps
* **Ishant Agarwala** — AI Engineer & UI/UX
* **Avik Singha Roy** — Database Administrator
* **Prathama Roy** — Presenter
