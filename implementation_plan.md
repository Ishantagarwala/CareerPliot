# UI & Visual Improvement Plan — Career Pilot

Comprehensive visual polish, animation upgrade, and dark mode fix across the entire application.

---

## 🔴 Critical: Chat Dark Mode Visibility Bug

**Problem identified** (see screenshots below):

In dark mode, the **user message bubble** has a `bg-primary` background. The `primary` color in this theme resolves to a dark/black tone in dark mode, while `text-primary-foreground` is supposed to be white — but the inline code blocks and markdown-formatted text inside the bubble use `text-white` hardcoded, which blends into the near-black bubble in dark mode. The **real issue**: the `bg-primary` in dark mode becomes an almost-black tone, and the `text-primary-foreground` is also dark-ish, creating **dark text on dark background**.

Additionally, the assistant bubble in dark mode uses `bg-card` which is a very dark surface, and `text-muted-foreground` for body text — this results in **low contrast grey text on dark background**.

### Fix:
- **User bubble**: Ensure `bg-primary` maps to a visible accent (it already does — the purple/indigo), and force `text-white` for all user message text in dark mode
- **Assistant bubble**: Use `text-foreground` instead of `text-muted-foreground` for better contrast on dark `bg-card`
- **Inline code in user bubble**: Fix the `bg-white/20 border-white/10` which is fine, but needs `text-white` explicitly
- **Chat feed background**: The `bg-muted/20` is too subtle in dark mode — increase to `bg-muted/30`

![Chat in dark mode with visibility issues](file:///Users/aritra/.gemini/antigravity-ide/brain/f9182b4e-c5aa-44c1-bd6d-e2db0b26872c/tutor_chat_active_1780587655488.png)

---

## Visual Issues Identified

1. **"How It Works" section** — 3 steps are disconnected circles with no visual connector
2. **Landing page hero** — tagline `animate-pulse` is too aggressive; no scroll entrance
3. **Feature cards** — appear all at once, no staggered entrance
4. **CTA section** — flat dark block, no animated gradient
5. **Footer** — plain, no gradient accent
6. **Sidebar** — solid black active state, no color accent
7. **Dashboard cards** — no entrance animations
8. **Auth pages** — static gradient blobs
9. **Overall** — zero scroll-reveal animations, app feels static

---

## Proposed Changes

### 1. Chat Dark Mode Fix (Priority)

#### [MODIFY] [MessageBubble.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/tutor/MessageBubble.tsx)

- Change assistant body text from `text-muted-foreground` → `text-foreground/80` for better dark-mode contrast
- Ensure user bubble uses explicit `text-white` everywhere (headers, paragraphs, list items)
- Fix inline code contrast in user bubbles

#### [MODIFY] [ChatInterface.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/tutor/ChatInterface.tsx)

- Increase chat feed background opacity: `bg-muted/20` → `bg-muted/30`
- Add `dark:bg-muted/10` to input bar area for better separation

---

### 2. Global CSS Animation System

#### [MODIFY] [globals.css](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/app/globals.css)

Add reusable keyframe animations (no JS library):
- `@keyframes fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`
- `@keyframes scaleIn`, `shimmer`, `float`, `gradientShift`
- Utility classes: `.animate-fade-in-up`, `.animate-scale-in`, `.animate-shimmer`, `.animate-float`
- Stagger delay utilities: `.delay-100` through `.delay-700`
- `.animate-on-scroll` — elements start invisible, animate when IntersectionObserver triggers

---

### 3. Scroll-Reveal Component

#### [NEW] [AnimateOnScroll.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/ui/AnimateOnScroll.tsx)

Lightweight `"use client"` component using IntersectionObserver to add `.is-visible` class when elements enter viewport. Wraps each landing page section.

---

### 4. Landing Page

#### [MODIFY] [page.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/app/page.tsx)

**Hero:**
- Replace `animate-pulse` → `animate-scale-in` on tagline badge
- Add staggered `fadeInUp` to headline, paragraph, buttons
- Add subtle floating gradient orb (CSS pseudo-element)

**Feature Cards:**
- Staggered `animate-fade-in-up` with increasing delays per card
- Gradient border on hover

**"How It Works" — MAJOR FIX:**
- Add horizontal connector dashed line between step circles via CSS
- Staggered scale-in animation for numbered circles
- Gradient fill on step circles

**CTA Section:**
- Animated gradient shimmer on background
- Glow pulse on "Sign Up Now" button

**Preview Cards:**
- Staggered `fadeInUp` entrance

---

### 5. Layout Components

#### [MODIFY] [Footer.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/layout/Footer.tsx)

- Add gradient accent line at top

#### [MODIFY] [Navbar.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/layout/Navbar.tsx)

- Gradient bottom border on scroll
- Smooth mobile menu animation

#### [MODIFY] [Sidebar.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/layout/Sidebar.tsx)

- Replace solid black active state → gradient accent (`from-indigo-500 to-purple-500`)
- Smooth icon scale on hover
- Fix tooltip dark mode colors

---

### 6. Auth Pages

#### [MODIFY] [login/page.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/app/(auth)/login/page.tsx)

- Add slow drift animation to decorative blobs
- Card entrance animation

#### [MODIFY] [register/page.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/app/(auth)/register/page.tsx)

- Same as login

---

### 7. Dashboard Components

#### [MODIFY] [StatsCard.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/dashboard/StatsCard.tsx)

- Add `fadeInUp` entrance with stagger delay prop

#### [MODIFY] [StreakTracker.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/dashboard/StreakTracker.tsx)

- Entrance animation on flame badge
- Staggered day cells

#### [MODIFY] [ProgressChart.tsx](file:///Users/aritra/Dev/Hackathon/bwu-ai-hackathon-2026/components/dashboard/ProgressChart.tsx)

- Animated progress bar fill

---

## Verification Plan

### Automated
- `npm run build` — verify no TS/compilation errors

### Browser Verification
- Screenshot all pages in light AND dark mode
- Specifically verify chat message readability in dark mode
- Verify scroll animations trigger correctly on landing page
- Verify sidebar active state gradient
