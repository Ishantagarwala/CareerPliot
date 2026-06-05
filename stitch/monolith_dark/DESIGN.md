---
name: Monolith Dark
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffffff'
  on-tertiary: '#2f3131'
  tertiary-container: '#e2e2e2'
  on-tertiary-container: '#636565'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
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
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system adopts a **Minimalist / High-Contrast** aesthetic designed for executive-level career management. The brand personality is authoritative, immutable, and precise. It targets high-performance professionals who require a workspace free of visual noise. The emotional response is one of absolute focus and "quiet power."

By utilizing a strictly monochromatic palette, the UI recedes to prioritize content and data. The style leans into architectural structuralism, favoring sharp lines, generous negative space, and a clear hierarchy that suggests stability and permanence.

## Colors
The palette is restricted to a high-contrast grayscale to ensure maximum legibility and a sophisticated "Obsidian" feel.

- **Primary (#FFFFFF):** Used exclusively for essential text, primary icons, and high-priority call-to-action fills.
- **Secondary (#1A1A1A):** Used for elevated surface layers, such as cards or flyouts, to create a subtle distinction from the background.
- **Neutral/Background (#0A0A0A):** The foundation of the UI. A deep, true charcoal that eliminates glare while maintaining "pure black" depth.
- **Borders/Dividers (#262626):** Subtle grey lines used to define structure without breaking the monochromatic flow.
- **Success/Progress:** Represented through white-on-black contrast or 100% white fills, avoiding traditional green/red unless absolutely critical for error states.

## Typography
The typographic system combines the contemporary precision of **Hanken Grotesk** for headings with the systematic utility of **Inter** for body text. **JetBrains Mono** is introduced for labels and metadata to reinforce the "system" and "data-driven" nature of the product.

In this dark mode iteration, font-weights are slightly reduced for body text to prevent "halation" (light text bleeding into dark backgrounds). Tracking is increased for monospaced labels to ensure glanceability at small sizes.

## Layout & Spacing
The design system utilizes a **Fixed Grid** philosophy on desktop to maintain a cinematic, centered composition. A 12-column grid is employed with generous 48px outer margins to create an "editorial" feel.

- **Vertical Rhythm:** Built on an 8px base unit. All component heights and margins must be multiples of 8.
- **Mobile Reflow:** On mobile, the grid collapses to a single column with 16px margins.
- **Density:** High whitespace is prioritized. Elements are never crowded; the "Monolith" feel relies on the "void" (empty space) as much as the content.

## Elevation & Depth
In this high-contrast dark environment, traditional shadows are replaced by **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Background):** #0A0A0A.
- **Level 1 (Cards/Surface):** #1A1A1A with a 1px border of #262626.
- **Level 2 (Popovers/Modals):** #262626 with a 1px border of #404040.
- **Interaction:** Hover states are indicated by increasing the border brightness or shifting the background from #1A1A1A to #262626. No blurs or glows are permitted, maintaining the sharp, brutalist edge.

## Shapes
This design system utilizes **Sharp (0px)** roundedness. Every element—buttons, cards, inputs, and dropdowns—must have 90-degree corners. This reinforces the architectural, "monolithic" aesthetic and distinguishes the system from the "softness" of consumer-grade apps. 

The only exception is purely circular elements (like user avatars), which should remain circles to contrast against the rigid structural grid.

## Components

- **Buttons:**
  - *Primary:* Solid #FFFFFF background with #0A0A0A text. No border.
  - *Secondary:* Transparent background with a 1px #FFFFFF border and #FFFFFF text.
  - *Tertiary:* Transparent background, #FFFFFF text, underlines on hover.
- **Input Fields:** 1px border of #262626. On focus, the border turns #FFFFFF. Labels use `label-sm` (JetBrains Mono) and sit strictly above the field.
- **Progress Indicators:** Linear bars with a #1A1A1A track and a solid #FFFFFF fill. No gradients.
- **Chips/Tags:** Small rectangular boxes with 1px #262626 borders and `label-sm` text.
- **Cards:** No shadow. Sharp 1px borders. Header sections within cards should be separated by a #262626 horizontal rule.
- **Lists:** Clean rows separated by 1px #262626 dividers. Hover states shift the background to #1A1A1A.