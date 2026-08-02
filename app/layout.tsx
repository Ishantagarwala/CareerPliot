import type { Metadata } from "next";
import { Anybody, Hanken_Grotesk, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AccentColorProvider } from "@/components/layout/AccentColor";
import CloudflareBotGuard from "@/components/security/CloudflareBotGuard";
import { getSiteUrl } from "@/lib/siteUrl";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Career Pilot — AI-Powered Career Planning",
    template: "%s | Career Pilot",
  },
  description:
    "AI career discovery, personalized learning roadmaps, live courses and jobs, document-aware tutoring, and resume scoring — built for students.",
  applicationName: "Career Pilot",
  keywords: [
    "Career Pilot",
    "AI career guidance",
    "career discovery",
    "learning roadmap",
    "student career planning",
    "AI tutor",
    "resume builder",
    "job board for students",
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Career Pilot",
    title: "Career Pilot — AI-Powered Career Planning",
    description:
      "Discover careers, build roadmaps, learn with AI tutoring, and track your progress — all in one platform.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Career Pilot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Career Pilot — AI-Powered Career Planning",
    description:
      "AI career discovery, roadmaps, courses, jobs, and tutoring for students.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anybody.variable} ${hanken.variable} ${spaceGrotesk.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
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
              <CloudflareBotGuard />
              {children}
              <Toaster position="top-right" richColors />
            </AccentColorProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
