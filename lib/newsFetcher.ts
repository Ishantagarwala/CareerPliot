/**
 * News Fetcher Utility
 * Fetches domain-aware career news from RSS + optional GNews.
 * Caches results in MongoDB with a 6-hour TTL so we stay under rate limits.
 */

import { DOMAIN_LIST } from "@/lib/careerDomains";

interface RawArticle {
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  sourceUrl: string;
  source: string;
  imageUrl?: string;
  tags: string[];
  category: 'Featured' | 'Live Feed' | 'In-Depth Analysis';
}

// Shared India / hiring feeds + per-domain sources from careerDomains config
const SHARED_FEEDS = [
  {
    url: 'https://yourstory.com/feed',
    source: 'YourStory',
    tags: ['India', 'Startups'],
    category: 'Live Feed' as const,
  },
  {
    url: 'https://entrackr.com/feed/',
    source: 'Entrackr',
    tags: ['India', 'Startups', 'Funding'],
    category: 'Live Feed' as const,
  },
];

function buildRssFeeds() {
  const seen = new Set<string>();
  const feeds: Array<{
    url: string;
    source: string;
    tags: string[];
    category: 'Featured' | 'Live Feed' | 'In-Depth Analysis';
  }> = [];

  for (const feed of [...SHARED_FEEDS, ...DOMAIN_LIST.flatMap((d) => d.newsFeeds)]) {
    if (seen.has(feed.url)) continue;
    seen.add(feed.url);
    feeds.push(feed);
  }
  return feeds;
}

const RSS_FEEDS = buildRssFeeds();

const GNEWS_QUERIES = DOMAIN_LIST.flatMap((d) => d.newsQueries);

// ── RSS Parser (simple XML→JSON, no npm dep) ──────────────────────────

function parseRSSItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  content: string;
  imageUrl?: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    pubDate: string;
    content: string;
    imageUrl?: string;
  }> = [];

  // Match <item> or <entry> blocks (RSS 2.0 and Atom)
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const getTag = (tag: string): string => {
      // Handle CDATA
      const cdataReg = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
      const cdataMatch = block.match(cdataReg);
      if (cdataMatch) return cdataMatch[1].trim();

      const simpleReg = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const simpleMatch = block.match(simpleReg);
      return simpleMatch ? simpleMatch[1].trim() : '';
    };

    // For Atom feeds, link might be in href attribute
    const linkMatch = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/i);
    const link = getTag('link') || (linkMatch ? linkMatch[1] : '');

    // Try to extract image
    const imgMatch = block.match(/<media:content[^>]*url="([^"]+)"/i) ||
      block.match(/<enclosure[^>]*url="([^"]+)"/i) ||
      block.match(/<img[^>]*src="([^"]+)"/i) ||
      block.match(/<media:thumbnail[^>]*url="([^"]+)"/i);

    const title = getTag('title');
    const description = getTag('description') || getTag('summary') || getTag('content');

    // Strip HTML from description for summary
    const cleanDescription = description
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    if (title) {
      items.push({
        title: title.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim(),
        link,
        description: cleanDescription,
        pubDate: getTag('pubDate') || getTag('published') || getTag('updated') || new Date().toISOString(),
        content: cleanDescription,
        imageUrl: imgMatch ? imgMatch[1] : undefined,
      });
    }
  }

  return items;
}

// ── Fetch from RSS ────────────────────────────────────────────────────

async function fetchRSSArticles(): Promise<RawArticle[]> {
  const allArticles: RawArticle[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CareerPilotBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
          },
        });
        clearTimeout(timeout);

        if (!res.ok) return [];

        const xml = await res.text();
        const items = parseRSSItems(xml);

        return items.slice(0, 5).map((item): RawArticle => ({
          title: item.title,
          summary: item.description.slice(0, 300) + (item.description.length > 300 ? '...' : ''),
          content: item.content,
          publishedAt: item.pubDate,
          sourceUrl: item.link,
          source: feed.source,
          imageUrl: item.imageUrl,
          tags: [...feed.tags],
          category: feed.category,
        }));
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allArticles.push(...result.value);
    }
  }

  return allArticles;
}

// ── Fetch from GNews API ──────────────────────────────────────────────

async function fetchGNewsArticles(apiKey: string): Promise<RawArticle[]> {
  if (!apiKey) return [];
  const allArticles: RawArticle[] = [];

  const results = await Promise.allSettled(
    GNEWS_QUERIES.map(async (query) => {
      try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query.q)}&lang=en&country=in&max=5&apikey=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) return [];

        const data = await res.json();
        if (!data.articles || !Array.isArray(data.articles)) return [];

        return data.articles.map((article: any, idx: number): RawArticle => ({
          title: article.title || 'Untitled',
          summary: (article.description || article.content || '').slice(0, 300),
          content: article.content || article.description || '',
          publishedAt: article.publishedAt || new Date().toISOString(),
          sourceUrl: article.url || '',
          source: article.source?.name || 'GNews',
          imageUrl: article.image || undefined,
          tags: query.tags,
          category: idx === 0 ? 'Featured' : 'Live Feed',
        }));
      } catch {
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      allArticles.push(...result.value);
    }
  }

  return allArticles;
}

// ── Estimate read time ────────────────────────────────────────────────

function estimateReadTime(content: string): string {
  const words = content.split(/\s+/).length;
  const mins = Math.max(1, Math.ceil(words / 200));
  return `${mins} Min Read`;
}

// ── Auto-tag articles with relevant keywords ──────────────────────────

function autoTag(article: RawArticle): string[] {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const extraTags: string[] = [];

  const tagKeywords: Record<string, string[]> = {
    'Hiring': ['hiring', 'recruit', 'job opening', 'talent', 'workforce', 'onboarding'],
    'Internship': ['internship', 'intern', 'graduate program', 'campus placement', 'fresher'],
    'Layoffs': ['layoff', 'laid off', 'job cuts', 'downsizing', 'restructuring'],
    'AI/ML': ['artificial intelligence', 'machine learning', 'ai ', 'llm', 'gpt', 'deep learning', 'generative ai'],
    'Funding': ['funding', 'raised', 'series a', 'series b', 'seed round', 'valuation', 'ipo', 'investment'],
    'India': ['india', 'indian', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'kolkata', 'noida', 'gurgaon', 'infosys', 'wipro', 'tcs'],
    'Policy': ['regulation', 'policy', 'government', 'ministry', 'digital india', 'rbi', 'sebi'],
    'Startups': ['startup', 'unicorn', 'founder', 'entrepreneur'],
    'Cloud': ['cloud', 'aws', 'azure', 'gcp', 'saas'],
    'Cybersecurity': ['cybersecurity', 'data breach', 'hack', 'vulnerability', 'security'],
    'Technology': ['software', 'developer', 'tech', 'saas', 'app'],
    'Healthcare': ['health', 'hospital', 'medical', 'doctor', 'pharma', 'clinical'],
    'Business': ['finance', 'market', 'bank', 'economy', 'commerce', 'accounting'],
    'Design': ['design', 'ux', 'ui', 'creative', 'figma', 'branding', 'illustration'],
    'Education': ['education', 'teacher', 'school', 'university', 'curriculum', 'classroom', 'edtech', 'student'],
    'Engineering': ['mechanical', 'electrical', 'civil engineer', 'manufacturing', 'infrastructure'],
    'Animation': ['animation', 'motion graphic', 'motion design', 'after effects', 'animator'],
    'Law': ['law', 'court', 'legal', 'supreme court', 'advocate', 'policy'],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => text.includes(kw)) && !article.tags.includes(tag)) {
      extraTags.push(tag);
    }
  }

  return [...new Set([...article.tags, ...extraTags])];
}

// ── Main Fetch & Cache function ───────────────────────────────────────

export async function fetchAndCacheNews(NewsModel: any): Promise<void> {
  const gnewsKey = process.env.GNEWS_API_KEY || '';

  // Fetch from all sources in parallel
  const [rssArticles, gnewsArticles] = await Promise.all([
    fetchRSSArticles(),
    fetchGNewsArticles(gnewsKey),
  ]);

  const allArticles = [...gnewsArticles, ...rssArticles];

  if (allArticles.length === 0) {
    console.log('[NewsFetcher] No articles fetched from any source.');
    return;
  }

  // Deduplicate by title (fuzzy — lowercase, strip punctuation)
  const seen = new Set<string>();
  const uniqueArticles = allArticles.filter((a) => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Newest first so Featured picks stay in the live API window (sorted by publishedAt).
  uniqueArticles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const featuredCandidates: typeof uniqueArticles = [];
  const otherArticles: typeof uniqueArticles = [];

  for (const a of uniqueArticles) {
    const tags = autoTag(a);
    a.tags = tags;
    const isFeatureWorthy =
      tags.includes("India") ||
      tags.includes("Hiring") ||
      tags.includes("Internship") ||
      tags.includes("Funding");
    if (isFeatureWorthy && featuredCandidates.length < 2) {
      featuredCandidates.push(a);
    } else {
      otherArticles.push(a);
    }
  }

  // Always surface something in Featured — fall back to newest overall.
  while (featuredCandidates.length < 2 && otherArticles.length > 0) {
    featuredCandidates.push(otherArticles.shift()!);
  }

  const categorized = [
    ...featuredCandidates.map((a) => ({
      title: a.title,
      summary: a.summary,
      content: a.content || a.summary,
      publishedAt: new Date(a.publishedAt),
      readTime: estimateReadTime(a.content || a.summary),
      tags: a.tags,
      category: "Featured" as const,
      imageUrl: a.imageUrl || undefined,
      imageAlt: a.title,
      sourceUrl: a.sourceUrl,
      source: a.source,
      fetchedAt: new Date(),
    })),
    ...otherArticles.map((a, idx) => ({
      title: a.title,
      summary: a.summary,
      content: a.content || a.summary,
      publishedAt: new Date(a.publishedAt),
      readTime: estimateReadTime(a.content || a.summary),
      tags: a.tags,
      category: (idx < 12 ? "Live Feed" : "In-Depth Analysis") as
        | "Live Feed"
        | "In-Depth Analysis",
      imageUrl: a.imageUrl || undefined,
      imageAlt: a.title,
      sourceUrl: a.sourceUrl,
      source: a.source,
      fetchedAt: new Date(),
    })),
  ];

  // Demote existing featured articles in the DB to 'Live Feed' so they don't block new ones
  try {
    await NewsModel.updateMany({ category: 'Featured' }, { $set: { category: 'Live Feed' } });
  } catch (err: any) {
    console.error('[NewsFetcher] Error demoting featured articles:', err.message);
  }

  // Upsert into MongoDB (deduplication by title)
  const bulkOps = categorized.map((article) => ({
    updateOne: {
      filter: { title: article.title },
      update: { $set: article },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    try {
      await NewsModel.bulkWrite(bulkOps, { ordered: false });
      console.log(`[NewsFetcher] Upserted ${bulkOps.length} articles.`);
    } catch (err: any) {
      // Ignore duplicate key errors from concurrent writes
      if (err.code !== 11000) {
        console.error('[NewsFetcher] Bulk write error:', err.message);
      }
    }
  }
}

// ── Check if cache is stale (> 5 minutes) ───────────────────────────────

export async function isCacheStale(NewsModel: any): Promise<boolean> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentCount = await NewsModel.countDocuments({
    fetchedAt: { $gte: fiveMinutesAgo },
  });
  return recentCount < 3; // Consider stale if fewer than 3 recent articles
}
