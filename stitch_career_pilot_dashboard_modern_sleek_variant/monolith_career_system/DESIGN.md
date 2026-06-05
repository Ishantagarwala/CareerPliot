---
name: Monolith Career System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built on a philosophy of **precision-led minimalism**. It targets ambitious professionals who value clarity, focus, and efficiency in their career development journey. By stripping away chromatic distractions, the UI directs the user's undivided attention toward data, progress, and actionable insights.

The aesthetic follows a **Modern Corporate** style with a hint of **Architectural Minimalism**. It emphasizes:
- **Absolute Clarity:** High-contrast typography ensures information hierarchy is immediate.
- **Purposeful Space:** Generous margins and breathing room prevent cognitive overload.
- **Structural Integrity:** Using subtle borders and tonal shifts instead of shadows creates a grounded, professional atmosphere that feels permanent and reliable.
- **Monochromatic Sophistication:** A grayscale palette evokes a sense of premium authority and "executive" focus.

## Colors

The palette is strictly monochromatic, utilizing a range of grays to define depth and hierarchy without the need for hue.

- **Primary (#000000):** Used for primary actions, headlines, and essential iconography to provide maximum contrast against the white background.
- **Secondary (#666666):** Reserved for body text, labels, and secondary supporting information.
- **Tertiary/Neutral (#E5E5E5 to #F5F5F5):** Used for structural elements like dividers, subtle borders, and background fills for cards or sidebar containers.
- **Feedback:** While the system is monochromatic, critical errors or success states may use a single semantic color (e.g., a deep muted red or forest green) only if absolutely necessary for accessibility, though the preference is to use iconography and weight for distinction.

## Typography

This design system utilizes a dual-typeface approach to balance character with utility.

- **Plus Jakarta Sans** is used for headlines. Its modern, slightly geometric curves provide a welcoming yet professional "voice" to the platform's titles and headers.
- **Inter** is the workhorse for body text and labels. Its high legibility and neutral tone make it perfect for dense data, descriptions, and UI controls.

**Key Rules:**
- Use **Bold/700** for primary headings to create a strong visual anchor.
- Use **Medium/500** or **SemiBold/600** for labels to differentiate them from standard body text.
- Maintain tight letter-spacing on larger headings to reinforce the "Architectural" feel.

## Layout & Spacing

The layout philosophy relies on a **Fixed-Fluid Hybrid Grid**. 

- **Desktop:** A 12-column grid with a maximum content width of 1440px. Sidebars are fixed at 280px, while the main content area fluidly adapts within the remaining space.
- **Tablet:** 8-column grid with reduced margins (24px).
- **Mobile:** 4-column grid with 16px margins.

**Spacing Rhythm:**
We use an 8px base unit. Generous "Macro-spacing" (48px+) is encouraged between major sections to emphasize the minimalist aesthetic. "Micro-spacing" (8px, 12px) is used within components to maintain tight associations between related elements.

## Elevation & Depth

To maintain the high-contrast, clean look requested, this design system eschews heavy drop shadows in favor of **Tonal Layering** and **Low-Contrast Outlines**.

- **Level 0 (Background):** Pure White (#FFFFFF).
- **Level 1 (Sidebar/Containers):** Light Grey Fill (#F5F5F5) with no border.
- **Level 2 (Cards/Interactables):** White Fill (#FFFFFF) with a 1px solid border (#E0E0E0).
- **Active State:** A subtle, extremely diffused shadow (0px 4px 20px rgba(0,0,0,0.05)) may be used only on hover to indicate interactivity.

Depth is communicated through "recession" (filling a container with a darker gray to make it feel "carved out") rather than "projection" (shadows).

## Shapes

The shape language is **Soft-Geometric**. 

We use a consistent 8px (`0.5rem`) corner radius for standard cards and input fields. This provides a modern, approachable feel that softens the starkness of the monochromatic palette. 

- **Large Components (Hero Sections):** 16px (`1rem`) radius.
- **Small Components (Buttons/Chips):** 8px (`0.5rem`) radius.
- **Icons:** Should follow a linear, 2px stroke weight with slightly rounded terminals to match the UI's geometry.

## Components

### Buttons
- **Primary:** Solid Black (#000000) background with White text. No border.
- **Secondary:** White background with a 1px solid Black border and Black text.
- **Tertiary:** Transparent background, Black text, underlined on hover.

### Input Fields
- **Default:** White background, 1px border (#E0E0E0), 8px radius. Text in #666666.
- **Focus:** 1px solid Black border with a subtle gray inner glow.

### Cards
- Always use a White background.
- 1px solid #E0E0E0 border.
- Padding should be generous (min 24px) to maintain the minimalist feel.

### Progress Indicators
- Use solid black fills for "completed" states.
- Use light gray (#E5E5E5) for "empty/track" states.
- Circular gauges (as seen in the reference) should use a 2px - 4px stroke weight for a refined look.

### Chips/Tags
- Small, 12px font size.
- Light gray fill (#F5F5F5) with no border.
- Used for metadata or category labels.