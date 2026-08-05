import type { Metadata } from "next";
import { Anybody, Hanken_Grotesk, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AccentColorProvider } from "@/components/layout/AccentColor";
import HCaptchaPreload from "@/components/security/HCaptchaPreload";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";
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
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
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
              <HCaptchaPreload />
              {children}
              <Toaster position="top-right" richColors />
            </AccentColorProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
