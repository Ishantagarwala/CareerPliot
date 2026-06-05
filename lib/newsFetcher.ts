/**
 * News Fetcher Utility
 * Fetches tech, hiring, and India-focused news from multiple free RSS feeds.
 * Caches results in MongoDB with a 6-hour TTL so we stay under rate limits.
 */

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

// ── RSS Feed Sources ──────────────────────────────────────────────────
// These are publicly accessible RSS feeds that don't need API keys.

const RSS_FEEDS = [
  // India Tech & Startup
  {
    url: 'https://techcrunch.com/tag/india/feed/',
    source: 'TechCrunch India',
    tags: ['India', 'Startups'],
    category: 'Featured' as const,
  },
  {
    url: 'https://inc42.com/feed/',
    source: 'Inc42',
    tags: ['India', 'Startups'],
    category: 'Featured' as const,
  },
  {
    url: 'https://yourstory.com/feed',
    source: 'YourStory',
    tags: ['India', 'Startups'],
    category: 'Live Feed' as const,
  },
  // Hiring & Jobs
  {
    url: 'https://www.techinasia.com/feed',
    source: 'Tech In Asia',
    tags: ['Hiring', 'Asia'],
    category: 'Live Feed' as const,
  },
  {
    url: 'https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms',
    source: 'ET Tech',
    tags: ['India', 'Tech Industry'],
    category: 'In-Depth Analysis' as const,
  },
  // General Tech
  {
    url: 'https://www.theverge.com/rss/index.xml',
    source: 'The Verge',
    tags: ['Tech', 'Global'],
    category: 'Live Feed' as const,
  },
  {
    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',
    source: 'Ars Technica',
    tags: ['Tech', 'Analysis'],
    category: 'In-Depth Analysis' as const,
  },
];

// ── GNews API (free, 100 req/day) ─────────────────────────────────────

const GNEWS_QUERIES = [
  { q: 'India tech hiring internship', tags: ['India', 'Hiring', 'Internship'] },
  { q: 'India startup funding', tags: ['India', 'Startups', 'Funding'] },
  { q: 'software developer jobs India', tags: ['India', 'Jobs', 'Tech Industry'] },
  { q: 'tech layoffs hiring India', tags: ['India', 'Hiring', 'Tech Industry'] },
];

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

  // Ensure we have category balance
  let featured = 0;
  let liveCount = 0;
  let analysisCount = 0;

  const categorized = uniqueArticles.map((a) => {
    // Auto-tag
    const tags = autoTag(a);

    // Balance categories
    let category = a.category;
    if (featured < 2 && (a.tags.includes('India') || a.tags.includes('Hiring'))) {
      category = 'Featured';
      featured++;
    } else if (liveCount < 12) {
      category = 'Live Feed';
      liveCount++;
    } else {
      category = 'In-Depth Analysis';
      analysisCount++;
    }

    return {
      title: a.title,
      summary: a.summary,
      content: a.content || a.summary,
      publishedAt: new Date(a.publishedAt),
      readTime: estimateReadTime(a.content || a.summary),
      tags,
      category,
      imageUrl: a.imageUrl || undefined,
      imageAlt: a.title,
      sourceUrl: a.sourceUrl,
      source: a.source,
      fetchedAt: new Date(),
    };
  });

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

// ── Check if cache is stale (> 6 hours) ───────────────────────────────

export async function isCacheStale(NewsModel: any): Promise<boolean> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentCount = await NewsModel.countDocuments({
    fetchedAt: { $gte: sixHoursAgo },
  });
  return recentCount < 3; // Consider stale if fewer than 3 recent articles
}
