import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AccentColorProvider } from "@/components/layout/AccentColor";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { getSiteUrl } from "@/lib/siteUrl";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

/**
 * Typefaces are vendored, not fetched.
 *
 * These were `next/font/google`, which downloads each family from
 * fonts.googleapis.com during `next build`. On the production VPS that fetch is
 * unreliable — one deploy died on a malformed response, another on a dropped
 * TLS connection — and a build failure there means the app cannot ship. The
 * four families are variable fonts, so each ships as one `*-var.woff2` (136 KB
 * total) declared with its full weight range. Builds are now deterministic and
 * offline; the CSS variable names are unchanged, so globals.css is untouched.
 *
 * Refresh with:
 *   css2?family=<Family>:wght@<weights>  → take the latin @font-face URL
 * (Google serves a single variable file per family regardless of the weights
 * requested — downloading one per weight just duplicates the same bytes).
 */
const anybody = localFont({
  src: "./fonts/anybody-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-anybody",
  display: "swap",
});

const hanken = localFont({
  src: "./fonts/hanken-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-hanken",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/space-var.woff2",
  weight: "300 700",
  style: "normal",
  variable: "--font-space",
  display: "swap",
});

/**
 * The AI Hub is set in Inter — its own typeface, scoped to that route via
 * `--font-inter`. The rest of the app keeps the display faces above.
 */
const inter = localFont({
  src: "./fonts/inter-var.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — AI Career Planning for Students`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Career Pilot",
    "career pilot",
    "AI career planning",
    "AI career guidance",
    "career discovery for students",
    "learning roadmap",
    "student career planning",
    "free career assessment",
    "AI tutor for students",
    "resume builder",
    "job board for students",
    "career roadmap generator",
  ],
  authors: [{ name: "Career Wallah" }],
  creator: "Career Wallah",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — AI Career Planning for Students`,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — AI Career Planning for Students`,
    description: DEFAULT_DESCRIPTION,
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION.trim(),
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anybody.variable} ${hanken.variable} ${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Root layout — applies to every page, so the single-page-font warning
            is a false positive here. Material Symbols is referenced by ligature
            class across many pages (see next.config.ts CSP notes). */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            storageKey="cp-theme"
          >
            <AccentColorProvider>
              {children}
              <Toaster position="top-right" richColors />
            </AccentColorProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
