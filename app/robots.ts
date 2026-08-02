import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: [
          "/dashboard",
          "/career",
          "/roadmap",
          "/courses",
          "/pdf",
          "/tutor",
          "/ai-hub",
          "/resume",
          "/study",
          "/news",
          "/profile",
          "/jobs",
          "/projects",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
