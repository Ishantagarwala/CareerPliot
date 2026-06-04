# 🚀 Career Pilot — 5-Minute Hackathon Demo Script

This guide outlines a bulletproof, 5-minute presentation flow designed to showcase Career Pilot's core value to the judges.

---

## ⏱️ Timeline & Action Plan

| Section | Duration | Screen Action | Talk Track Focus |
| :--- | :--- | :--- | :--- |
| **1. Hook & Problem** | 0:30 | Landing Page (`/`) | The pain students face trying to map their careers and find curated learning materials. |
| **2. Auth & Seed** | 0:20 | Register/Login (`/register`) | Seamless student onboarding. *Self-Service Seed shortcut* (Trigger `/api/seed` in background) to show an instant loaded profile. |
| **3. Career Match** | 1:00 | Career Discovery (`/career`) | Explain AI assessment and how compatibility matching results in selecting a path. |
| **4. Roadmap & Courses** | 1:15 | Roadmap (`/roadmap`) & Courses (`/courses`) | Showcase step-by-step milestones (Beginner, Intermediate, Advanced) and filtered learning materials. |
| **5. AI Study Tools** | 1:25 | PDF Assistant (`/pdf`) & AI Tutor (`/tutor`) | Highlight deep learning modules: PDF parsing, auto-summarization, MCQ testing, and live contextual tutoring. |
| **6. Dashboard & Wrap** | 0:30 | Dashboard (`/dashboard`) | Summary of composite readiness score, active streaks, and impact statement. |

---

## 🎙️ Detailed Walkthrough Script

### **1. Introduction: Hook & Problem (30s)**
- **Visual**: Show the public landing page (`/`) in Light or Dark Mode.
- **Action**: Scroll down briefly through the *unified platform* features and the *3-step workflow*.
- **Script**:
  > *"Good morning, judges. Every student faces a daunting challenge upon entering university: 'What career path should I choose, and how do I build the exact skills to get hired?' Traditional career counselor services are static, generic courses are scattered across dozens of platforms, and studying textbooks or PDFs takes hours of manual filtering.*
  >
  > *This is why we built **Career Pilot**—an all-in-one, AI-guided career planning and student-readiness workspace. It doesn't just suggest careers; it builds custom interactive timelines, curates courses, summaries materials, and tutors students in real-time."*

---

### **2. Signup & Quick Onboarding (20s)**
- **Visual**: Click **Get Started Free** to go to `/register` or login at `/login`.
- **Action**: Log in with a demo account, or register a new one. Once logged in, trigger the API seed route (by submitting a POST to `/api/seed` or navigating to `/api/seed` in another tab) to populate the account instantly for the judges.
- **Script**:
  > *"Onboarding is seamless. Let's log in to our student account. Using our secure NextAuth integration, students log in and are immediately directed to their customized dashboard."*

---

### **3. Career Discovery (60s)**
- **Visual**: Navigate to **Career Discovery** (`/career`).
- **Action**: If you've seeded the database, show the selected career path: **Full-Stack Web Developer** with a **94% match score** and custom reasoning.
- **Script**:
  > *"First, the discovery phase. Instead of a rigid questionnaire, our AI analyzes interests, goals, and current skill ratings. Here, our student, aritra, has been matched with a **Full-Stack Web Developer** path with a 94% compatibility. The AI explains exactly *why* this fits—highlighting JavaScript and Web Tech skills. We select this path to initialize our custom curriculum."*

---

### **4. Roadmap & Filtered Courses (1m 15s)**
- **Visual**: Navigate to **Learning Roadmap** (`/roadmap`), toggle a milestone, then click **Course Recommendations** (`/courses`).
- **Action**: Show the timeline stages (Beginner → Intermediate → Advanced). Check off an intermediate milestone, then browse courses filtering by "Intermediate" and "Free".
- **Script**:
  > *"Once a path is selected, Career Pilot generates a personalized **Learning Roadmap**. The curriculum is split into three phases: Beginner, Intermediate, and Advanced milestones. As the student finishes a milestone—like React State—they toggle it, instantly updating their progress metrics.*
  >
  > *But how do they learn? We resolve course search paralysis. In the **Course Recommendations** tab, the platform pulls courses directly matching their active milestones. We can filter for Free, Beginner, or Advanced platforms—linking out to high-quality resources like Scrimba or freeCodeCamp instantly."*

---

### **5. AI Study Tools: PDF & Chat Tutor (1m 25s)**
- **Visual**: Navigate to **AI PDF Assistant** (`/pdf`), select `"Web_Dev_Syllabus.pdf"`, switch tabs between *Summary* and *Quiz*. Then click **AI Tutor** (`/tutor`) and show chat logs.
- **Action**: Toggle between PDF Summary and PDF Quiz. Submit a quick query to the Tutor (e.g. *"Explain JS closure"*).
- **Script**:
  > *"When students study academic textbooks or class PDFs, they need efficiency. In our **AI PDF Assistant**, they upload any note or syllabus. Our parser extracts the text, generates structured markdown summaries, and builds conceptual practice quizzes.*
  >
  > *If a student is stuck on a concept—say, JavaScript Closures—they can click over to the **AI Tutor**. Our tutor has full context of their career roadmap and active documents. Responses are streamed with syntax-highlighted code blocks, acting as a personal, encouraging 24/7 teaching assistant."*

---

### **6. Dashboard Summary & Closing (30s)**
- **Visual**: Navigate back to the **Dashboard** (`/dashboard`).
- **Action**: Hover over the **Overall Readiness circle gauge** (showing 50%) and point to the **5-day streak counter**.
- **Script**:
  > *"Finally, everything ties back to our student **Dashboard**. Career Pilot aggregates roadmap completions, course progress, parsed PDFs, and chat sessions to calculate a dynamic **Overall Readiness Score**. This tells the student exactly how close they are to being job-ready. We also track their **Daily Habit Streak** to maintain learning consistency.*
  >
  > *Career Pilot transforms career discovery from guess-work into a structured, execution-focused game plan. Thank you, and we're happy to take your questions."*
