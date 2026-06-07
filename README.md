# 🚀 Career Pilot — AI Career Guidance & Learning Assistant

[![Brainware AI Hackathon 2026](https://img.shields.io/badge/Brainware%20AI%20Hackathon-2026-blueviolet?style=for-the-badge)](https://github.com/aritraio/bwu-ai-hackathon-2026)
[![Made By](https://img.shields.io/badge/Made%20By-Career%20Wallah-orange?style=for-the-badge)](#)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Postgres-blue?style=for-the-badge)](#-tech-stack)

Welcome to the official repository for **Career Pilot**, an AI-powered career guidance and personalized learning assistant developed by **Career Wallah** for the **Brainware AI Hackathon 2026**.

Career Pilot is designed to eliminate the uncertainty in career planning for students. By combining interest profiling, customized roadmaps, smart course curations, interactive document analysis, and a 24/7 AI tutor, Career Pilot helps students navigate their professional journey from initial discovery to industry readiness.

> For the comprehensive project charter, milestone trackers, and sprint details, see the [Full Project Specification (CAREER_PILOT.md)](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/CAREER_PILOT.md).

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
*   **📄 Interactive PDF & Notes Assistant:** Allows students to upload PDFs/notes to extract summaries, generate flashcards, and create practice MCQs.
*   **🤖 24/7 AI Tutor Chatbot:** Direct interface for real-time concept explanation, code debugging, and step-by-step guidance.
*   **📊 Progress Tracking Dashboard:** Keeps tabs on completed course milestones, study streaks, document uploads, and overall job readiness.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│   React.js + Bootstrap + React Router + Axios                   │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│   │  Auth UI  │ │ Career   │ │ Roadmap  │ │ Course/PDF/Tutor │  │
│   │  Module   │ │ Discovery│ │ Viewer   │ │    Modules       │  │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│        │             │            │                 │            │
└────────┼─────────────┼────────────┼─────────────────┼────────────┘
         │             │            │                 │
         ▼             ▼            ▼                 ▼
   ╔═══════════════════════════════════════════════════════════╗
   ║                   REST API LAYER                          ║
   ║              Node.js + Express.js Server                  ║
   ║                                                           ║
   ║  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   ║
   ║  │ Auth Routes  │  │ Career API  │  │ AI Integration  │   ║
   ║  │ (JWT+bcrypt) │  │   Routes    │  │   Controller    │   ║
   ║  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   ║
   ║         │                │                   │            ║
   ╚═════════╪════════════════╪═══════════════════╪════════════╝
             │                │                   │
      ┌──────▼──────┐  ┌─────▼──────┐   ┌────────▼────────┐
      │  PostgreSQL  │  │  PostgreSQL │   │   OpenAI API    │
      │  (Users,     │  │  (Careers,  │   │  (GPT-4/3.5)    │
      │   Auth)      │  │  Roadmaps,  │   │                 │
      │              │  │  Courses,   │   │  ┌────────────┐ │
      │              │  │  Progress)  │   │  │ pdf-parse  │ │
      │              │  │             │   │  │ multer     │ │
      │              │  │             │   │  └────────────┘ │
      └──────────────┘  └─────────────┘   └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Description / Use Case |
| :--- | :--- | :--- |
| **Frontend** | **React.js** | Interactive and component-driven user interface |
| **UI Styling** | **Bootstrap 5** | Responsive layout and pre-styled UI components |
| **Routing** | **React Router v6** | Client-side routing with protected dashboard views |
| **HTTP Client** | **Axios** | API request orchestration and JWT authentication header insertion |
| **Backend** | **Node.js + Express.js** | Lightweight REST API server development |
| **Database** | **PostgreSQL** | Structured relational store for profiles, progress, and history |
| **Auth** | **JWT & bcrypt** | Industry-standard token-based session handling & password security |
| **AI Engine** | **OpenAI API** | High-quality reasoning models (GPT-4 / GPT-3.5-turbo) |
| **PDF Extraction**| **pdf-parse & multer** | File upload orchestration and text extraction pipelines |

---

## 📂 Project Structure

The project code is divided into three main logical directories:

```
career-pilot/
├── client/                     # React Frontend
│   ├── src/
│   │   ├── components/         # Modular interface components (Auth, Career, PDF, Tutor, Dashboard)
│   │   ├── context/            # AuthContext & User state management
│   │   └── services/           # Axios-based backend integrations
├── server/                     # Node.js Express Backend
│   ├── config/                 # Database connectors and environments
│   ├── controllers/            # Controller layers handling core business logic
│   ├── middleware/             # Security middlewares (JWT verification, rate limiters)
│   ├── routes/                 # Express API endpoints
│   └── uploads/                # Local staging for notes & PDFs
└── database/
    └── schema.sql              # Database setup and DDL schema scripts
```

---

## ⚡ Getting Started & Setup

### Prerequisites
Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16+ recommended)
*   [PostgreSQL](https://www.postgresql.org/) (running locally or cloud instances like Supabase/Railway)
*   [OpenAI API Key](https://platform.openai.com/)

### Backend Installation (`/server`)
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your `.env` file using the configuration schema:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://username:password@localhost:5432/career_pilot
   JWT_SECRET=your_jwt_signing_secret
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Initialize the PostgreSQL schema:
   ```bash
   psql -U username -d career_pilot -f ../database/schema.sql
   ```
5. Start the backend developer server:
   ```bash
   npm run dev
   ```

### Frontend Installation (`/client`)
1. Navigate to the client folder:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the development proxy or environment variable in `.env`:
   ```env
   REACT_APP_API_URL=http://localhost:5000
   ```
4. Start the frontend developer server:
   ```bash
   npm start
   ```

---

## 📅 Hackathon Timeline & Team

### 👥 Developed by Career Wallah
*   **Frontend Lead:** UI/UX, Component Routing, API Integrations
*   **Backend Lead:** Server Orchestration, JWT Auth, Database Architecture
*   **AI Engineer:** OpenAI API Prompt Engineering, Document Processing Pipelines
*   **Database & DevOps:** Deployment (Supabase/Vercel/Render), DB schemas, Environment setups
*   **UI/UX & Presenter:** Wireframes, pitch deck, live demo preparation

### 🗓️ Important Deadlines
*   **Proposal Submission:** June 22, 2026 *(👉 [Official Google Submission Form](https://docs.google.com/forms/d/e/1FAIpQLScRTibBU0jWGa2KRuu6MZyII2OMWVusAUUGIKzFFvS_F_khcg/viewform?usp=dialog))*
*   **Prototype Screening:** 2nd Week of July 2026
*   **Prototype Shortlisting:** 4th Week of July 2026
*   **Final Presentation:** August 2026

---

## 📞 Contact & Queries

For any general queries or clarification regarding the hackathon guidelines, reach out to the university organizers:
*   **Dr. Subhankar Saha** | [dss.me@brainwareuniversity.ac.in](mailto:dss.me@brainwareuniversity.ac.in) | +91-9957593969
*   **Dr. Indrani Paul** | [dip.bt@brainwareuniversity.ac.in](mailto:dip.bt@brainwareuniversity.ac.in) | +91-9614597629