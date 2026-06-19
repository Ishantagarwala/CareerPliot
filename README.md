# 🚀 Career Pilot — AI Career Guidance & Learning Assistant

[![Brainware AI Hackathon 2026](https://img.shields.io/badge/Brainware%20AI%20Hackathon-2026-blueviolet?style=for-the-badge)](https://github.com/aritraio/bwu-ai-hackathon-2026)
[![Made By](https://img.shields.io/badge/Made%20By-Career%20Wallah-orange?style=for-the-badge)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20MongoDB%20%7C%20Tailwind-blue?style=for-the-badge)](#-tech-stack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](file:///home/pacific/Downloads/CareerPliot/LICENSE)

Welcome to the official repository for **Career Pilot**, an AI-powered career guidance and personalized learning assistant developed by **Career Wallah** for the **Brainware AI Hackathon 2026**.

Career Pilot is designed to eliminate the uncertainty in career planning for students. By combining interest profiling, customized roadmaps, smart course curations, interactive document analysis, and a 24/7 AI tutor, Career Pilot helps students navigate their professional journey from initial discovery to industry readiness.

> For the comprehensive project charter, milestone trackers, and sprint details, see the [Full Project Specification (CAREER_PILOT.md)](file:///home/pacific/Downloads/test/career-pilot/CAREER_PILOT.md).

---

## 📌 Table of Contents
1. [Core Features](#-core-features)
2. [System Architecture](#-system-architecture)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Getting Started & Setup](#-getting-started--setup)
6. [Hackathon Timeline & Team](#-hackathon-timeline--team)
7. [Contact & Queries](#-contact--queries)

---

## 🌟 Core Features

*   **🧭 AI Career Discovery Engine:** Analyzes user interests, favorite academic subjects, skills, and goals to match them with the most compatible career paths.
*   **🗺️ Personalized Career Roadmaps:** Generates a structured, stage-wise learning path (Beginner → Intermediate → Advanced) for the selected career path.
*   **📚 Smart Course Recommendation:** Curates free and paid courses across YouTube, Coursera, Udemy, freeCodeCamp, and Kaggle based on goals and budget constraints.
*   **📄 Interactive PDF & Notes Assistant:** Powered by **PDF.co API** (with local PDF.js fallback), allows students to upload PDFs/notes to extract summaries, generate flashcards, and create practice MCQs.
*   **🤖 24/7 AI Tutor Chatbot:** Direct interface for real-time concept explanation, code debugging, and step-by-step guidance.
*   **📝 Standalone Resume ATS Analyzer:** Analyze your resume's formatting, keyword density, and overall ATS compatibility, mapping them against custom job descriptions.
*   **💼 Job Board & Skill Matcher:** Real-time SDE and tech jobs fetched via **Remotive API** featuring a custom Match Score highlighting your matched profile skills.
*   **🏆 HackerEarth & Devfolio Hub:** Real-time hackathon discovery and coding challenges.
*   **📰 India Tech News Feed:** Live tech industry news aggregated from **Entrackr**, **Moneycontrol**, and **Livemint** to keep students up-to-date with the tech ecosystem.
*   **📊 Progress Tracking Dashboard:** Keeps tabs on completed course milestones, study streaks, document uploads, and overall job readiness.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   Next.js 15 (App Router) + React Server Components             │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│   │  Auth UI  │ │ Career   │ │ Roadmap  │ │ Course/PDF/Tutor │  │
│   │  Module   │ │ Discovery│ │ Viewer   │ │    Modules       │  │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│        │             │            │                 │            │
└────────┼─────────────┼────────────┼─────────────────┼────────────┘
         │             │            │                 │
         ▼             ▼            ▼                 ▼
   ╔═══════════════════════════════════════════════════════════╗
   ║              NEXT.JS API ROUTES LAYER                     ║
   ║         /app/api/* (Route Handlers + Server Actions)      ║
   ║                                                           ║
   ║  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   ║
   ║  │ Auth Routes  │  │ Career API  │  │ AI Integration  │   ║
   ║  │ (NextAuth)   │  │   Routes    │  │    Service       │   ║
   ║  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   ║
   ║         │                │                   │            ║
   ╚═════════╪════════════════╪═══════════════════╪════════════╝
             │                │                   │
      ┌──────▼──────┐  ┌─────▼──────┐   ┌────────▼────────┐
      │   MongoDB    │  │   MongoDB   │   │   OpenAI API    │
      │  (Users,     │  │  (Careers,  │   │  (GPT-4/3.5)    │
      │   Auth)      │  │  Roadmaps,  │   │                 │
      │  [Mongoose]  │  │  Courses,   │   │  ┌────────────┐ │
      │              │  │  Progress)  │   │  │ PDF.co API │ │
      │              │  │ [Mongoose]  │   │  │ pdf-parse  │ │
      │              │  │             │   │  └────────────┘ │
      └──────────────┘  └─────────────┘   └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description / Use Case |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Unified frontend rendering, React Server Components, and secure API routes |
| **UI Styling** | **Tailwind CSS 4 + shadcn/ui** | Utility-first responsive design coupled with modern, accessible UI components |
| **Database** | **MongoDB (Atlas)** | Document-based flexible cloud database ideal for rapid feature expansion |
| **ODM** | **Mongoose 8** | Schema validation, middleware hooks, and structured MongoDB queries |
| **Auth** | **NextAuth.js (Auth.js v5)** | Session management, credential login, CSRF protection, and middleware route security |
| **AI Engine** | **OpenAI API** | High-quality reasoning models (GPT-4 / GPT-3.5-turbo) |
| **PDF Extraction**| **PDF.co API & pdf-parse** | Multi-page PDF text extraction with local PDF.js fallback |
| **External APIs** | **Remotive, Devfolio, HackerEarth** | Real-time jobs list, challenges, and hackathon discovery integrations |
| **News Aggregators**| **Entrackr, Moneycontrol, Livemint** | Aggregated India tech ecosystem news feeds |

---

## 📂 Project Structure

```
career-pilot/
├── app/                          # Next.js App Router (Pages, Layouts, & API Routes)
│   ├── (auth)/                   # Authentication route group (login, register)
│   ├── (dashboard)/              # Protected dashboard pages (career, roadmap, pdf, tutor, jobs)
│   └── api/                      # Backend API Route Handlers
├── components/                   # Reusable React UI Components
│   ├── ui/                       # shadcn/ui primitive component library
│   ├── layout/                   # Navbar, Sidebar, and Footer
│   ├── career/                   # Assessment forms and recommendations
│   ├── pdf/                      # PDF uploaders and summary views
│   └── tutor/                    # AI Chat interface elements
├── lib/                          # Shared utilities (DB connection, auth config, pdf services)
├── models/                       # Mongoose Schemas (User, Roadmap, Document, Resume, etc.)
├── public/                       # Static assets
└── tsconfig.json                 # TypeScript configuration
```

---

## ⚡ Getting Started & Setup

### Prerequisites
Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v18+ recommended)
*   [MongoDB Atlas](https://www.mongodb.com/atlas) (or local MongoDB server instance)
*   [OpenAI API Key](https://platform.openai.com/)

### Installation & Run

1. Clone the repository and navigate to the project directory:
   ```bash
   cd career-pilot
   ```

2. Install the project dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables in `.env.local` using the template below:
    ```env
    AUTH_SECRET=your_auth_secret_here
    MONGODB_URI=your_mongodb_connection_string
    ZENMUX_API_KEY=your_zenmux_api_key_here
    ZENMUX_BASE_URL=https://zenmux.ai/api/v1
    ZENMUX_MODEL=openai/gpt-4o-mini
    ZENMUX_PDF_MODEL=openai/gpt-4o
    PDF_CO_API_KEY=your_pdf_co_api_key
    ```

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📅 Hackathon Timeline & Team

### 👥 Developed by Career Wallah
*   **Sujoy Singha** - Team Leader, Full-Stack & Presentation Lead
*   **Aritra Saha** - Backend & DevOps
*   **Ishant Agarwala** - AI Engineer & UI/UX
*   **Avik Singha Roy** - DB Administrator


### 🗓️ Important Deadlines
*   **Proposal Submission:** June 22, 2026 *(👉 [Official Google Submission Form](https://docs.google.com/forms/d/e/1FAIpQLScRTibBU0jWGa2KRuu6MZyII2OMWVusAUUGIKzFFvS_F_khcg/viewform?usp=dialog))*
*   **Prototype Screening:** 2nd Week of July 2026
*   **Prototype Shortlisting:** 4th Week of July 2026
*   **Final Presentation:** August 2026

---

## 📞 Contact & Queries

For any general queries or clarification regarding the hackathon guidelines, reach out to the university organizers:
*   **Dr. Subhankar Saha** | dss.me@brainwareuniversity.ac.in | +91-9957593969
*   **Dr. Indrani Paul** | dip.bt@brainwareuniversity.ac.in | +91-9614597629