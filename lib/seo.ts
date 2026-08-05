import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export const SITE_NAME = "Career Pilot";
export const DEFAULT_DESCRIPTION =
  "Free AI career planning for students — discover careers, build personalized learning roadmaps, find courses and jobs, and learn with a 24/7 AI tutor.";

export function pageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  index = true,
}: {
  title: string;
  description?: string;
  path: string;
  index?: boolean;
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return {
    title,
    description,
    alternates: {
      canonical: normalizedPath,
    },
    openGraph: {
      title,
      description,
      url: normalizedPath,
    },
    twitter: {
      title,
      description,
    },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function buildHomeJsonLd(siteUrl: string, faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Career Wallah",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        sameAs: [],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#app`,
        name: SITE_NAME,
        url: siteUrl,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        description: DEFAULT_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        provider: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: faqs.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}
