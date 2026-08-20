const SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://careerpilot.cc/</loc>
    <lastmod>2026-08-19</lastmod>
  </url>
</urlset>
`;

export function GET() {
  return new Response(SITEMAP_XML, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
