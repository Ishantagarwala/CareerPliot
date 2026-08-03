import { normalizeImageUrl } from "@/lib/imageUrl";

/**
 * Live course providers keyed off roadmap milestones.
 * - Coursera: public catalog API (list + local keyword filter, cached)
 * - YouTube: Data API v3 when YOUTUBE_API_KEY is set (long-form courses)
 * - Fallback: real provider search deep-links (always valid URLs)
 */

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface RoadmapTopic {
  level: SkillLevel;
  query: string;
  milestoneTitle: string;
}

export interface ProviderCourse {
  title: string;
  platform: string;
  url: string;
  skillLevel: SkillLevel;
  isFree: boolean;
  rating?: number;
  sourceTopic?: string;
  thumbnailUrl?: string;
  externalId?: string;
}

interface CourseraElement {
  id: string;
  name: string;
  slug: string;
  photoUrl?: string;
  description?: string;
}

interface CatalogCache {
  fetchedAt: number;
  items: CourseraElement[];
}

const COURSERA_CATALOG = "https://api.coursera.org/api/courses.v1";
const YOUTUBE_SEARCH = "https://www.googleapis.com/youtube/v3/search";
const CATALOG_TTL_MS = 1000 * 60 * 60 * 12; // 12h
const CATALOG_TARGET = 1200;

let catalogCache: CatalogCache | null = null;
let catalogPromise: Promise<CourseraElement[]> | null = null;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "your", "you", "learn", "learning",
  "basic", "basics", "intro", "introduction", "advanced", "intermediate", "beginner",
  "using", "build", "building", "create", "creating", "a", "an", "of", "to", "in",
  "on", "or", "as", "is", "are", "be", "by", "how", "what", "get", "started",
]);

export function extractRoadmapTopics(
  stages: Array<{ name?: string; milestones?: Array<{ title?: string; completed?: boolean }> }>,
  careerPath: string
): RoadmapTopic[] {
  const topics: RoadmapTopic[] = [];
  const levels: SkillLevel[] = ["beginner", "intermediate", "advanced"];

  for (const level of levels) {
    const stage = stages.find((s) => s.name === level);
    const milestones = stage?.milestones || [];
    const preferred = [
      ...milestones.filter((m) => !m.completed),
      ...milestones.filter((m) => m.completed),
    ];

    const picked = preferred.slice(0, 2);
    if (picked.length === 0) {
      topics.push({
        level,
        query: `${careerPath} ${level}`,
        milestoneTitle: `${careerPath} · ${level}`,
      });
      continue;
    }

    for (const m of picked) {
      const title = (m.title || "").trim();
      if (!title) continue;
      topics.push({
        level,
        query: title,
        milestoneTitle: title,
      });
    }
  }

  // Cap topics so we don't fan out too many provider calls.
  return topics.slice(0, 6);
}

export function roadmapFingerprint(
  careerPath: string,
  stages: Array<{ name?: string; milestones?: Array<{ title?: string }> }>
): string {
  const parts = [careerPath];
  for (const stage of stages || []) {
    parts.push(stage.name || "");
    for (const m of stage.milestones || []) {
      parts.push(m.title || "");
    }
  }
  // Simple stable hash (not crypto) — enough for cache invalidation.
  let hash = 0;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return `rm_${Math.abs(hash).toString(36)}`;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function scoreMatch(text: string, tokens: string[]): number {
  const hay = text.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += t.length > 5 ? 2 : 1;
  }
  return score;
}

async function loadCourseraCatalog(): Promise<CourseraElement[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.items;
  }
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    const items: CourseraElement[] = [];
    const pageSize = 100;
    // First page tells us total; then pull a useful slice in parallel.
    const firstUrl = new URL(COURSERA_CATALOG);
    firstUrl.searchParams.set("start", "0");
    firstUrl.searchParams.set("limit", String(pageSize));
    firstUrl.searchParams.set("fields", "name,slug,photoUrl,description");

    const firstRes = await fetch(firstUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!firstRes.ok) return items;

    const firstData = await firstRes.json();
    const firstBatch: CourseraElement[] = Array.isArray(firstData?.elements) ? firstData.elements : [];
    for (const el of firstBatch) {
      if (el?.name && el?.slug) {
        items.push({
          id: el.id,
          name: el.name,
          slug: el.slug,
          photoUrl: el.photoUrl,
          description: el.description,
        });
      }
    }

    const total = Math.min(Number(firstData?.paging?.total) || CATALOG_TARGET, CATALOG_TARGET);
    const starts: number[] = [];
    for (let s = pageSize; s < total; s += pageSize) starts.push(s);

    // Parallel page fetches (chunked to avoid bursting).
    const chunkSize = 5;
    for (let i = 0; i < starts.length; i += chunkSize) {
      const chunk = starts.slice(i, i + chunkSize);
      const pages = await Promise.all(
        chunk.map(async (start) => {
          const url = new URL(COURSERA_CATALOG);
          url.searchParams.set("start", String(start));
          url.searchParams.set("limit", String(pageSize));
          url.searchParams.set("fields", "name,slug,photoUrl,description");
          const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
          if (!res.ok) return [] as CourseraElement[];
          const data = await res.json();
          return (Array.isArray(data?.elements) ? data.elements : []) as CourseraElement[];
        })
      );

      for (const batch of pages) {
        for (const el of batch) {
          if (el?.name && el?.slug) {
            items.push({
              id: el.id,
              name: el.name,
              slug: el.slug,
              photoUrl: el.photoUrl,
              description: el.description,
            });
          }
        }
      }
    }

    catalogCache = { fetchedAt: Date.now(), items };
    return items;
  })().finally(() => {
    catalogPromise = null;
  });

  return catalogPromise;
}

export async function searchCoursera(
  query: string,
  level: SkillLevel,
  limit = 2
): Promise<ProviderCourse[]> {
  try {
    const catalog = await loadCourseraCatalog();
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const ranked = catalog
      .map((c) => ({
        c,
        score: scoreMatch(`${c.name} ${c.description || ""}`, tokens),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked.map(({ c }) => ({
      title: c.name,
      platform: "Coursera",
      url: `https://www.coursera.org/learn/${c.slug}`,
      skillLevel: level,
      isFree: false, // Coursera often has audit/free options; mark paid by default
      rating: 4.5,
      sourceTopic: query,
      thumbnailUrl: normalizeImageUrl(c.photoUrl),
      externalId: `coursera:${c.id || c.slug}`,
    }));
  } catch (err) {
    console.error("Coursera catalog search failed:", err);
    return [];
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** True for real video cards (`youtube:<id>`), not search deep-links. */
export function isLiveYouTubeExternalId(externalId?: string | null): boolean {
  return typeof externalId === "string" && /^youtube:[a-zA-Z0-9_-]+$/.test(externalId);
}

const YT_EXTRA_STOP = new Set([
  "solidify", "rebuilding", "existing", "pages", "dynamic", "driven", "ship",
  "reusable", "library", "buttons", "cards", "inputs", "modals", "portfolio",
  "own", "full", "cycle", "hit", "least", "annual", "future", "comp",
  "establish", "credibility", "negotiations", "enough", "literacy", "manage",
  "functional", "small", "group", "early", "collect", "through", "interviews",
  "analytics", "usage", "data", "based", "behavior", "focus", "improving",
  "willingness", "pay", "acquire", "first", "paying", "customers", "direct",
  "outreach", "partnerships", "content", "communities", "targeted", "campaigns",
  "founder", "operating", "systems", "tracking", "metrics", "managing", "product",
  "roadmap", "handling", "customer", "support", "making", "decisions", "iterate",
  "end", "citation", "backed", "history", "stored", "three", "modern",
]);

/**
 * Milestone titles are long sentences — YouTube relevance collapses on them.
 * Prefer the skill headline (before : or —), then keep a few strong tokens.
 */
export function buildYouTubeSearchQuery(query: string, level: SkillLevel): string {
  const headline = query.split(/[:—–]/)[0]?.trim() || query;
  const tokens = tokenize(headline).filter((t) => !YT_EXTRA_STOP.has(t));
  // Fall back to full-query tokens if the headline was too thin.
  const pool = tokens.length >= 2 ? tokens : tokenize(query).filter((t) => !YT_EXTRA_STOP.has(t));
  const core = pool.slice(0, 5).join(" ");
  const base = core || headline.slice(0, 60).trim() || query.slice(0, 60).trim();
  return `${base} full course tutorial`.trim();
}

async function youtubeSearchRequest(
  key: string,
  searchQ: string,
  opts: { categoryEducation?: boolean; maxResults: number }
): Promise<any[]> {
  const url = new URL(YOUTUBE_SEARCH);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoDuration", "long");
  if (opts.categoryEducation) {
    url.searchParams.set("videoCategoryId", "27");
  }
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("maxResults", String(opts.maxResults));
  url.searchParams.set("q", searchQ);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const apiMessage =
      data?.error?.message ||
      data?.error?.errors?.[0]?.reason ||
      "(no error body)";
    console.error("YouTube search failed:", res.status, apiMessage, "q=", searchQ);
    return [];
  }
  if (data?.error) {
    console.error("YouTube API error payload:", data.error?.message || data.error);
    return [];
  }
  return Array.isArray(data?.items) ? data.items : [];
}

export async function searchYouTube(
  query: string,
  level: SkillLevel,
  limit = 2
): Promise<ProviderCourse[]> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return [];

  const tokens = tokenize(query);
  const searchQ = buildYouTubeSearchQuery(query, level);
  const maxResults = Math.min(Math.max(limit * 4, 6), 10);

  try {
    let items = await youtubeSearchRequest(key, searchQ, {
      categoryEducation: true,
      maxResults,
    });

    // Education category is often too strict for niche tech topics — retry open search.
    if (items.length === 0) {
      items = await youtubeSearchRequest(key, searchQ, {
        categoryEducation: false,
        maxResults,
      });
    }

    // Still empty? try an even shorter query (first 3 tokens).
    if (items.length === 0) {
      const shortTokens = tokenize(query.split(/[:—–]/)[0] || query)
        .filter((t) => !YT_EXTRA_STOP.has(t))
        .slice(0, 3);
      if (shortTokens.length > 0) {
        items = await youtubeSearchRequest(
          key,
          `${shortTokens.join(" ")} full course tutorial`,
          { categoryEducation: false, maxResults }
        );
      }
    }

    const ranked = items
      .map((item: any) => {
        const videoId = item?.id?.videoId;
        const rawTitle = item?.snippet?.title;
        if (!videoId || !rawTitle) return null;
        const title = decodeHtmlEntities(String(rawTitle));
        const blurb = `${title} ${item?.snippet?.description || ""}`;
        const score = tokens.length > 0 ? scoreMatch(blurb, tokens) : 1;
        return {
          score,
          course: {
            title,
            platform: "YouTube",
            url: `https://www.youtube.com/watch?v=${videoId}`,
            skillLevel: level,
            isFree: true,
            rating: 4.6,
            sourceTopic: query,
            thumbnailUrl:
              item?.snippet?.thumbnails?.medium?.url ||
              item?.snippet?.thumbnails?.high?.url ||
              item?.snippet?.thumbnails?.default?.url,
            externalId: `youtube:${videoId}`,
          } satisfies ProviderCourse,
        };
      })
      .filter(Boolean) as Array<{ score: number; course: ProviderCourse }>;

    const relevant = ranked
      .filter((r) => (tokens.length === 0 ? true : r.score > 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.course);

    // Never return score-0 junk (e.g. unrelated long-form videos).
    return relevant;
  } catch (err) {
    console.error("YouTube search error:", err);
    return [];
  }
}

function shortTopicLabel(query: string, level: SkillLevel): string {
  return buildYouTubeSearchQuery(query, level).replace(/ full course tutorial \w+$/, "").trim();
}

function courseraSearchFallback(query: string, level: SkillLevel): ProviderCourse {
  const short = shortTopicLabel(query, level) || query.slice(0, 80);
  const q = encodeURIComponent(short);
  return {
    title: `Coursera: ${short}`,
    platform: "Coursera",
    url: `https://www.coursera.org/search?query=${q}`,
    skillLevel: level,
    isFree: false,
    rating: 4.4,
    sourceTopic: query,
    externalId: `coursera-search:${q}:${level}`,
  };
}

function youtubeSearchFallback(query: string, level: SkillLevel): ProviderCourse {
  const searchQ = buildYouTubeSearchQuery(query, level);
  const short = shortTopicLabel(query, level) || query.slice(0, 80);
  const q = encodeURIComponent(searchQ);
  return {
    title: `YouTube: ${short} full course`,
    platform: "YouTube",
    url: `https://www.youtube.com/results?search_query=${q}`,
    skillLevel: level,
    isFree: true,
    rating: 4.3,
    sourceTopic: query,
    externalId: `youtube-search:${q}:${level}`,
  };
}

export async function fetchCoursesForTopics(topics: RoadmapTopic[]): Promise<ProviderCourse[]> {
  const batches = await Promise.all(
    topics.map(async (topic) => {
      const [coursera, youtube] = await Promise.all([
        searchCoursera(topic.query, topic.level, 2),
        searchYouTube(topic.query, topic.level, 2),
      ]);

      const combined: ProviderCourse[] = [...youtube, ...coursera];

      // Always keep a YouTube option visible — live videos when the API works,
      // otherwise a real YouTube search deep-link (key missing / quota / error).
      if (youtube.length === 0) {
        combined.push(youtubeSearchFallback(topic.query, topic.level));
      }
      if (coursera.length === 0) {
        combined.push(courseraSearchFallback(topic.query, topic.level));
      }

      return combined.map((c) => ({
        ...c,
        sourceTopic: topic.milestoneTitle,
      }));
    })
  );

  const flat = batches.flat();
  const seen = new Set<string>();
  const deduped: ProviderCourse[] = [];

  for (const course of flat) {
    const key = course.externalId || course.url;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(course);
  }

  return deduped;
}
