# ✅ Career Pilot — Development TODO

> **Tech Stack**: Next.js 15 (App Router) + MongoDB (Mongoose) + NextAuth.js + Tailwind CSS + shadcn/ui + OpenAI API
>
> **Team FinessBaba | Brainware AI Hackathon 2026**

---

## 📋 Phase 1 — Foundation (Days 1–3)

### 1.1 Requirements & Planning
- [ ] Finalize feature list and user flows with full team
- [ ] Create wireframes for all major screens (Figma/Excalidraw):
  - [ ] Landing Page
  - [ ] Login / Register Pages
  - [ ] Career Discovery Assessment Page
  - [ ] Recommendations Results Page
  - [ ] Roadmap Viewer Page
  - [ ] Course Recommendations Page
  - [ ] PDF Upload & Analysis Page
  - [ ] AI Tutor Chat Page
  - [ ] Progress Dashboard Page
- [ ] Finalize color palette, typography, and design tokens

### 1.2 Project Initialization
- [x] Initialize Next.js 15 project with TypeScript:
  ```bash
  npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
  ```
- [x] Install core dependencies:
  ```bash
  npm install mongoose next-auth@beta bcryptjs openai pdf-parse formidable
  npm install -D @types/bcryptjs @types/formidable
  ```
- [x] Initialize shadcn/ui:
  ```bash
  npx -y shadcn@latest init
  ```
- [x] Install essential shadcn/ui components:
  ```bash
  npx -y shadcn@latest add button card input label form dialog sheet avatar badge progress tabs separator toast dropdown-menu
  ```
- [x] Setup project structure (create all directories):
  ```
  mkdir -p app/(auth)/login app/(auth)/register
  mkdir -p app/(dashboard)/career app/(dashboard)/roadmap app/(dashboard)/courses
  mkdir -p app/(dashboard)/pdf app/(dashboard)/tutor app/(dashboard)/dashboard
  mkdir -p app/api/auth/register app/api/auth/\[...nextauth\]
  mkdir -p app/api/career/assess app/api/career/recommendations app/api/career/select
  mkdir -p app/api/roadmap/progress app/api/courses/\[careerPath\]
  mkdir -p app/api/pdf/upload app/api/pdf/summary/\[docId\] app/api/pdf/questions/\[docId\]
  mkdir -p app/api/tutor/chat app/api/tutor/history app/api/progress
  mkdir -p components/ui components/auth components/career components/roadmap
  mkdir -p components/courses components/pdf components/tutor components/dashboard components/layout
  mkdir -p lib models hooks types public docs/wireframes
  ```

### 1.3 Environment Configuration
- [x] Create `.env.local` with required variables:
  ```env
  # MongoDB
  MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/career-pilot?retryWrites=true&w=majority

  # NextAuth.js
  NEXTAUTH_URL=http://localhost:3000
  NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

  # OpenAI
  OPENAI_API_KEY=sk-...
  ```
- [x] Create `.env.example` (same keys, no values) and commit it
- [x] Update `.gitignore` to include `.env.local`

### 1.4 MongoDB Atlas Setup
- [ ] Create a free MongoDB Atlas account (https://www.mongodb.com/atlas)
- [ ] Create a free M0 cluster (Shared tier)
- [ ] Create a database user with read/write permissions
- [ ] Whitelist your IP address (or use `0.0.0.0/0` for development)
- [ ] Get the connection string and update `.env.local`
- [ ] Install MongoDB Compass for local database browsing

### 1.5 Database Connection & Models
- [x] Create `lib/db.ts` — MongoDB/Mongoose connection singleton:
  ```typescript
  // Handles connection caching for serverless (Vercel) environment
  // Uses global mongoose cache to prevent connection leaks
  ```
- [x] Create all Mongoose models in `models/` directory:
  - [x] `models/User.ts` — User schema (name, email, password, provider)
  - [x] `models/UserProfile.ts` — Assessment data (interests, goals, subjects, skills)
  - [x] `models/CareerRecommendation.ts` — AI career suggestions with scores
  - [x] `models/Roadmap.ts` — Stage-wise learning path with milestones
  - [x] `models/Course.ts` — Course recommendations catalog
  - [x] `models/Document.ts` — Uploaded PDFs with summaries/questions
  - [x] `models/ChatHistory.ts` — AI tutor conversation history
  - [x] `models/UserProgress.ts` — Progress tracking metrics
- [ ] Test MongoDB connection by running `npm run dev` and hitting a test API route

### 1.6 Authentication Setup (NextAuth.js)
- [x] Create `lib/auth.ts` — NextAuth.js configuration:
  - [x] Configure Credentials provider (email/password login)
  - [x] Configure JWT session strategy
  - [x] Add custom `authorize` function that queries MongoDB
  - [x] Add session/JWT callbacks to include user ID
- [x] Create `app/api/auth/[...nextauth]/route.ts` — NextAuth catch-all
- [x] Create `app/api/auth/register/route.ts` — Custom registration endpoint:
  - [x] Validate input (name, email, password)
  - [x] Check if user already exists
  - [x] Hash password with bcryptjs
  - [x] Save user to MongoDB
- [x] Create `proxy.ts` (instead of deprecated `middleware.ts`) — Route protection:
  - [x] Protect all `/dashboard/*` routes (and `/career/*`, `/roadmap/*`, etc.)
  - [x] Redirect unauthenticated users to `/login`

---

## 📋 Phase 2 — Core Modules (Days 4–10)

### 2.1 Layout & Navigation
- [ ] Create `app/layout.tsx` — Root layout:
  - [ ] Import Google Fonts (Inter / Outfit)
  - [ ] Add SessionProvider wrapper
  - [ ] Add Toaster for notifications
  - [ ] Set metadata (title, description, favicon)
- [ ] Create `components/layout/Navbar.tsx`:
  - [ ] Logo + brand name
  - [ ] Navigation links (conditional on auth state)
  - [ ] User avatar + dropdown menu (profile, logout)
  - [ ] Mobile-responsive hamburger menu
- [ ] Create `components/layout/Sidebar.tsx` (for dashboard):
  - [ ] Links: Career, Roadmap, Courses, PDF, Tutor, Dashboard
  - [ ] Active state highlighting
  - [ ] Collapsible on mobile
- [ ] Create `components/layout/Footer.tsx`
- [ ] Create `app/(dashboard)/layout.tsx` — Dashboard layout with sidebar

### 2.2 Landing Page
- [ ] Create `app/page.tsx` — Public landing page:
  - [ ] Hero section with tagline + CTA buttons (Sign Up / Log In)
  - [ ] Feature highlights section (6 core features with icons)
  - [ ] How it works section (3-step flow)
  - [ ] Testimonials / stats section
  - [ ] Footer with links

### 2.3 Authentication UI
- [ ] Create `components/auth/LoginForm.tsx`:
  - [ ] Email & password inputs with validation
  - [ ] "Remember me" checkbox
  - [ ] Submit button with loading state
  - [ ] Link to register page
  - [ ] Error handling & toast notifications
  - [ ] Call `signIn('credentials', { ... })` from NextAuth
- [ ] Create `components/auth/RegisterForm.tsx`:
  - [ ] Name, email, password, confirm password inputs
  - [ ] Client-side validation
  - [ ] Submit to `/api/auth/register` endpoint
  - [ ] Auto-login after successful registration
- [ ] Create `app/(auth)/login/page.tsx` — Login page wrapper
- [ ] Create `app/(auth)/register/page.tsx` — Register page wrapper

### 2.4 Career Discovery Module
- [ ] Create `components/career/AssessmentForm.tsx`:
  - [ ] Multi-step form with progress indicator:
    - Step 1: Select interests (checkboxes / tag cloud)
    - Step 2: Define career goals (text area)
    - Step 3: Pick favorite subjects (multi-select)
    - Step 4: Rate current skills (sliders / select dropdowns)
  - [ ] "Next" / "Back" navigation between steps
  - [ ] Submit assessment data to API
- [ ] Create `app/api/career/assess/route.ts`:
  - [ ] Receive assessment data from form
  - [ ] Save to `UserProfile` collection
  - [ ] Construct prompt with user's interests, goals, subjects, skills
  - [ ] Call OpenAI API for career matching
  - [ ] Parse AI response into structured career recommendations
  - [ ] Save recommendations to `CareerRecommendation` collection
  - [ ] Return recommendations to frontend
- [ ] Create `components/career/RecommendationCard.tsx`:
  - [ ] Career title + match score (visual badge)
  - [ ] "Why this fits you" reasoning text
  - [ ] "Select this path" button
- [ ] Create `app/(dashboard)/career/page.tsx` — Career discovery page
- [ ] Create `app/api/career/recommendations/route.ts` — GET recommendations
- [ ] Create `app/api/career/select/route.ts` — PUT to select a career

### 2.5 Roadmap Module
- [ ] Create `app/api/roadmap/route.ts`:
  - [ ] GET: Fetch roadmap for authenticated user
  - [ ] If no roadmap exists, generate one via OpenAI based on selected career
  - [ ] Save generated roadmap to `Roadmap` collection
- [ ] Create `components/roadmap/RoadmapViewer.tsx`:
  - [ ] Visual stage-wise timeline (Beginner → Intermediate → Advanced)
  - [ ] Milestone cards within each stage
  - [ ] Checkmarks for completed milestones
  - [ ] Current stage highlighted
- [ ] Create `components/roadmap/MilestoneCard.tsx`:
  - [ ] Milestone title + description
  - [ ] Completion toggle button
  - [ ] Visual progress indicator
- [ ] Create `app/api/roadmap/progress/route.ts`:
  - [ ] PUT: Toggle milestone completion status
  - [ ] Update `currentStage` if all milestones in a stage are done
- [ ] Create `app/(dashboard)/roadmap/page.tsx` — Roadmap viewer page

### 2.6 Course Recommendation Module
- [ ] Create `app/api/courses/route.ts`:
  - [ ] GET with query params: `?careerPath=...&level=...&budget=...`
  - [ ] Query OpenAI to generate course recommendations OR
  - [ ] Query `Course` collection with filters
- [ ] Create `app/api/courses/[careerPath]/route.ts`:
  - [ ] GET courses filtered by specific career path
- [ ] Create `components/courses/CourseCard.tsx`:
  - [ ] Course title, platform badge, skill level tag
  - [ ] Free/Paid indicator
  - [ ] Rating display (stars)
  - [ ] External link to course
- [ ] Create `components/courses/CourseFilters.tsx`:
  - [ ] Career path selector
  - [ ] Skill level filter (Beginner / Intermediate / Advanced)
  - [ ] Budget filter (Free / Paid / Both)
  - [ ] Platform filter
- [ ] Create `app/(dashboard)/courses/page.tsx` — Course recommendations page

---

## 📋 Phase 3 — AI Modules (Days 11–16)

### 3.1 AI PDF & Notes Assistant
- [ ] Create `app/api/pdf/upload/route.ts`:
  - [ ] Parse multipart form data with `formidable`
  - [ ] Extract text content with `pdf-parse`
  - [ ] Send extracted text to OpenAI for summarization
  - [ ] Generate MCQs and flashcards via OpenAI
  - [ ] Save document metadata + results to `Document` collection
  - [ ] Return summary + questions to frontend
- [ ] Create `app/api/pdf/summary/[docId]/route.ts`:
  - [ ] GET: Retrieve saved summary for a document
- [ ] Create `app/api/pdf/questions/[docId]/route.ts`:
  - [ ] GET: Retrieve generated questions for a document
- [ ] Create `components/pdf/PdfUploader.tsx`:
  - [ ] Drag-and-drop file upload zone
  - [ ] File type validation (PDF only for MVP)
  - [ ] Upload progress indicator
  - [ ] Processing state animation
- [ ] Create `components/pdf/SummaryViewer.tsx`:
  - [ ] Structured summary display with sections
  - [ ] Key takeaways list
  - [ ] Copy to clipboard functionality
- [ ] Create `components/pdf/QuizViewer.tsx`:
  - [ ] MCQ display with selectable options
  - [ ] Flashcard flip animation
  - [ ] Score tracking for quiz mode
- [ ] Create `app/(dashboard)/pdf/page.tsx` — PDF assistant page

### 3.2 AI Tutor Chat Interface
- [ ] Create `app/api/tutor/chat/route.ts`:
  - [ ] POST: Receive user message
  - [ ] Load recent chat history from `ChatHistory` collection
  - [ ] Build conversation context with system prompt
  - [ ] Stream response from OpenAI API
  - [ ] Save user message + AI response to chat history
- [ ] Create `app/api/tutor/history/route.ts`:
  - [ ] GET: Retrieve chat history for authenticated user
- [ ] Create `components/tutor/ChatInterface.tsx`:
  - [ ] Real-time chat UI with message bubbles
  - [ ] User message input with send button
  - [ ] Auto-scroll to latest message
  - [ ] Typing indicator while AI responds
  - [ ] Markdown rendering in AI responses
  - [ ] Code syntax highlighting in responses
- [ ] Create `components/tutor/MessageBubble.tsx`:
  - [ ] Different styling for user vs AI messages
  - [ ] Timestamp display
  - [ ] Copy message button
- [ ] Create `app/(dashboard)/tutor/page.tsx` — AI tutor chat page

### 3.3 Progress Tracking Dashboard
- [ ] Create `app/api/progress/route.ts`:
  - [ ] GET: Aggregate progress data for authenticated user:
    - Roadmap milestones completed / total
    - Courses completed count
    - PDFs analyzed count
    - Tutor sessions count
    - Current streak days
    - Overall readiness score (calculated)
- [ ] Create `components/dashboard/StatsCard.tsx`:
  - [ ] Icon + metric label + value
  - [ ] Animated counter on page load
  - [ ] Color-coded by status
- [ ] Create `components/dashboard/ProgressChart.tsx`:
  - [ ] Visual progress through roadmap stages
  - [ ] Milestone completion percentage bar
- [ ] Create `components/dashboard/StreakTracker.tsx`:
  - [ ] Calendar heatmap or streak counter
  - [ ] "Keep your streak alive!" motivation
- [ ] Create `app/(dashboard)/dashboard/page.tsx` — Progress dashboard page

---

## 📋 Phase 4 — Polish & Deploy (Days 17–20)

### 4.1 UI/UX Polish
- [ ] Add loading skeletons for all data-fetching pages
- [ ] Add error boundaries and fallback UI
- [ ] Implement toast notifications for all user actions (success/error)
- [ ] Add micro-animations and transitions (page transitions, hover effects)
- [ ] Ensure full mobile responsiveness on all pages
- [ ] Dark mode support (via Tailwind + CSS variables)
- [ ] Optimize images and assets

### 4.2 Testing
- [ ] Test all API route handlers with Thunder Client / Postman:
  - [ ] Auth: register, login, session, logout
  - [ ] Career: assess, get recommendations, select career
  - [ ] Roadmap: get roadmap, update milestone progress
  - [ ] Courses: get courses with filters
  - [ ] PDF: upload, get summary, get questions
  - [ ] Tutor: send message, get history
  - [ ] Progress: get progress data
- [ ] End-to-end user flow testing:
  - [ ] New user registration → assessment → career selection → roadmap view
  - [ ] Course browsing with filters
  - [ ] PDF upload and analysis
  - [ ] AI tutor conversation
  - [ ] Progress dashboard viewing
- [ ] Edge case testing:
  - [ ] Empty states (no recommendations, no roadmap, no courses)
  - [ ] Invalid file uploads
  - [ ] Network error handling
  - [ ] Session expiry handling

### 4.3 Deployment (Vercel + MongoDB Atlas)
- [ ] Push code to GitHub `main` branch
- [ ] Connect GitHub repo to Vercel
- [ ] Configure Vercel environment variables:
  - [ ] `MONGODB_URI` (production Atlas connection string)
  - [ ] `NEXTAUTH_URL` (production URL)
  - [ ] `NEXTAUTH_SECRET` (production secret)
  - [ ] `OPENAI_API_KEY` (production key)
- [ ] Deploy and verify production build
- [ ] Test all features on production URL
- [ ] Promote MongoDB Atlas cluster to production config:
  - [ ] Verify IP whitelist includes Vercel IPs (or use `0.0.0.0/0`)
  - [ ] Create database indexes for performance
  - [ ] Enable monitoring and alerts

### 4.4 Demo Preparation
- [ ] Prepare demo flow script (5-minute walkthrough):
  1. Hook: Problem statement (30s)
  2. Sign Up: Quick registration (20s)
  3. Career Discovery: Fill assessment → Show AI recommendations (60s)
  4. Roadmap: Display personalized learning path (45s)
  5. Courses: Show filtered recommendations (30s)
  6. PDF Assistant: Upload a PDF → Show summary + MCQs (60s)
  7. AI Tutor: Ask a coding question → Get real-time answer (45s)
  8. Dashboard: Show progress tracking (20s)
  9. Close: Future vision + impact statement (30s)
- [ ] Seed database with demo data (pre-filled user with progress)
- [ ] Create presentation slides (backup for demo failures)
- [ ] Practice demo run with full team (at least 3 times)
- [ ] Prepare for judge Q&A:
  - [ ] API cost model & scalability
  - [ ] Data privacy & security
  - [ ] Differentiation from competitors
  - [ ] Technical architecture decisions

---

## 🎯 Key Commands Reference

```bash
# Development
npm run dev                    # Start dev server (http://localhost:3000)
npm run build                  # Production build
npm run start                  # Start production server
npm run lint                   # Run ESLint

# shadcn/ui - Add components as needed
npx shadcn@latest add [component-name]

# Generate NextAuth secret
openssl rand -base64 32

# Git workflow
git checkout -b dev            # Development branch
git add . && git commit -m "..." 
git push origin dev
```

---

## 📝 Environment Variables Checklist

| Variable | Where to Get It | Required |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas → Connect → Drivers | ✅ Yes |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) / production URL | ✅ Yes |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | ✅ Yes |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | ✅ Yes |

---

> **⚡ Priority Order**: Auth → Career Discovery → Roadmap → Courses → PDF → Tutor → Dashboard
>
> **🚨 If behind schedule**: Drop PDF Assistant and AI Tutor. Core value is in Career Discovery + Roadmap + Courses.

---

*Last Updated: June 4, 2026 | Team FinessBaba*
