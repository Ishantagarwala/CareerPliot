"use client";

import { useState, useEffect, useCallback } from "react";
import PageLoader from "@/components/layout/PageLoader";
import { toast } from "sonner";
import {
  Search,
  Newspaper,
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Briefcase,
  Globe,
  Zap,
} from "lucide-react";

interface NewsArticle {
  _id: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  category: "Featured" | "Live Feed" | "In-Depth Analysis";
  imageUrl?: string;
  imageAlt?: string;
  sourceUrl?: string;
  source?: string;
}

// ── Tag icon mapper ───────────────────────────────────────────────────
function getTagIcon(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("hiring") || t.includes("jobs") || t.includes("internship"))
    return <Briefcase className="h-3 w-3" />;
  if (t.includes("india") || t.includes("global") || t.includes("asia"))
    return <Globe className="h-3 w-3" />;
  if (t.includes("ai") || t.includes("tech") || t.includes("cloud"))
    return <Zap className="h-3 w-3" />;
  if (t.includes("funding") || t.includes("startup"))
    return <TrendingUp className="h-3 w-3" />;
  return null;
}

// ── Time-ago formatter ────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ── Fallback Image Finder by Tag ──────────────────────────────────────
function getFallbackImage(tags: string[] = []): string {
  const t = tags.map((val) => val.toLowerCase());
  if (t.some((val) => val.includes("ai") || val.includes("ml") || val.includes("intelligence") || val.includes("chatbot"))) {
    return "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80"; // AI
  }
  if (t.some((val) => val.includes("startup") || val.includes("funding"))) {
    return "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80"; // Startups
  }
  if (t.some((val) => val.includes("hiring") || val.includes("jobs") || val.includes("internship"))) {
    return "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=800&q=80"; // Jobs
  }
  if (t.some((val) => val.includes("india"))) {
    return "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80"; // India/Tech
  }
  return "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"; // General Tech
}

// ── Priority tags for quick filter ────────────────────────────────────
const PRIORITY_TAGS = [
  "India",
  "Hiring",
  "Internship",
  "Design",
  "Creative",
  "Animation",
  "UX",
  "Healthcare",
  "Business",
  "Law",
  "Technology",
  "Startups",
  "Funding",
  "Policy",
];

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [domainLabel, setDomainLabel] = useState<string>("Your field");

  // Fetch articles on mount
  const loadNews = useCallback(async (forceRefresh = false, silent = false) => {
    try {
      if (forceRefresh && !silent) setRefreshing(true);
      const url = forceRefresh ? "/api/news?refresh=true" : "/api/news";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (Array.isArray(data)) {
        setArticles(data);
      } else {
        setArticles(Array.isArray(data.articles) ? data.articles : []);
        if (data.domainLabel) setDomainLabel(data.domainLabel);
      }
      if (forceRefresh && !silent) {
        toast.success("News feed refreshed with latest articles");
      }
    } catch {
      if (!silent) {
        toast.error("Failed to retrieve career news");
      }
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNews();

    // Auto-refresh tech news every 3 minutes silently
    const interval = setInterval(() => {
      loadNews(true, true);
    }, 180000);

    return () => clearInterval(interval);
  }, [loadNews]);

  // Filter items client-side for rapid instant response
  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesTag = activeTag
      ? article.tags.some((t) => t.toLowerCase() === activeTag.toLowerCase())
      : true;

    return matchesSearch && matchesTag;
  });

  // Extract featured, live feed, and analysis items
  const featuredArticles = filteredArticles.filter(
    (a) => a.category === "Featured"
  );
  // Fallback: if Featured is missing from the payload, use the newest story.
  const featuredArticle =
    featuredArticles[0] ||
    [...filteredArticles].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )[0];
  const liveFeedArticles = filteredArticles.filter(
    (a) => a.category === "Live Feed" && a._id !== featuredArticle?._id
  );
  const inDepthArticles = filteredArticles.filter(
    (a) => a.category === "In-Depth Analysis" && a._id !== featuredArticle?._id
  );

  // Get unique tags list — prioritize commonly-needed ones
  const allTags = Array.from(new Set(articles.flatMap((a) => a.tags)));
  const sortedTags = [
    ...PRIORITY_TAGS.filter((t) => allTags.includes(t)),
    ...allTags.filter((t) => !PRIORITY_TAGS.includes(t)),
  ];

  // Count articles per category for stats bar
  const totalCount = filteredArticles.length;
  const indiaCount = filteredArticles.filter((a) =>
    a.tags.some((t) => t.toLowerCase() === "india")
  ).length;
  const hiringCount = filteredArticles.filter((a) =>
    a.tags.some((t) =>
      ["hiring", "internship", "jobs"].includes(t.toLowerCase())
    )
  ).length;

  if (loading) {
    return <PageLoader label="Loading news" />;
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">
                newspaper
              </span>
            </span>
            Daily Dispatch
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            News tailored to <span className="font-semibold text-foreground">{domainLabel}</span> —
            hiring, industry shifts, and career signals for your path. Not a generic tech dump.
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          {/* Refresh Button */}
          <button
            onClick={() => loadNews(true)}
            disabled={refreshing}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh Feed"}
          </button>

          {/* Custom Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Intelligence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums tracking-tight text-foreground">
              {totalCount}
            </p>
            <p className="text-[13px] font-medium text-muted-foreground">
              Total Briefs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums tracking-tight text-foreground">
              {indiaCount}
            </p>
            <p className="text-[13px] font-medium text-muted-foreground">
              India Focused
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-xl font-bold tabular-nums tracking-tight text-foreground">
              {hiringCount}
            </p>
            <p className="text-[13px] font-medium text-muted-foreground">
              Hiring / Intern
            </p>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTag(null)}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            !activeTag
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All News
        </button>
        {sortedTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              activeTag === tag
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {getTagIcon(tag)}
            {tag}
          </button>
        ))}
      </div>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Featured Article Showcase (Span 8) */}
        <div className="lg:col-span-8">
          {featuredArticle ? (
            <a
              href={featuredArticle.sourceUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group block h-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-card no-underline shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
            >
                <div className="relative h-[300px] w-full overflow-hidden bg-accent sm:h-[380px]">
                <img
                  src={featuredArticle.imageUrl || getFallbackImage(featuredArticle.tags)}
                  alt={featuredArticle.imageAlt || "Featured image"}
                  referrerPolicy="no-referrer"
                  className="h-full w-full scale-100 object-cover opacity-90 transition-opacity duration-500 group-hover:scale-105 group-hover:opacity-100"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = getFallbackImage(featuredArticle.tags);
                    if (img.src !== fallback) img.src = fallback;
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute left-4 top-4 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-soft">
                    Featured Brief
                  </span>
                  {featuredArticle.source && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
                      {featuredArticle.source}
                    </span>
                  )}
                </div>
                {featuredArticle.sourceUrl && (
                  <div className="absolute right-4 top-4">
                    <span className="flex items-center justify-center rounded-lg border border-border bg-card p-1.5 opacity-0 shadow-soft transition-opacity group-hover:opacity-100">
                      <ExternalLink className="h-3.5 w-3.5 text-foreground" />
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-grow flex-col bg-card p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {timeAgo(featuredArticle.publishedAt)}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {featuredArticle.readTime}
                  </span>
                </div>

                <h3 className="mb-4 text-xl font-bold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-2xl">
                  {featuredArticle.title}
                </h3>
                <p className="mb-6 flex-grow text-sm leading-relaxed text-muted-foreground">
                  {featuredArticle.summary}
                </p>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                  <div className="flex flex-wrap gap-2">
                    {featuredArticle.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground"
                      >
                        {getTagIcon(tag)}
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors">
                    Read Full Article
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </a>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Newspaper className="mb-2 h-8 w-8 text-muted-foreground" />
              No featured tech dispatches match your search.
            </div>
          )}
        </div>

        {/* Live Feed Sidebar (Span 4) */}
        <aside className="flex h-[550px] flex-col rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-4">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Live Feed
            </h4>
            <span className="text-xs font-medium text-muted-foreground">
              Real-Time Alerts
            </span>
          </div>

          <div className="flex-1 divide-y divide-border/60 overflow-y-auto pr-1">
            {liveFeedArticles.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-xs italic text-muted-foreground">
                No active live alerts match filters.
              </div>
            ) : (
              liveFeedArticles.map((article) => (
                <a
                  key={article._id}
                  href={article.sourceUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-2 block flex cursor-pointer flex-col gap-2 rounded-lg px-2 py-4 no-underline transition-colors first:pt-0 hover:bg-muted/50 group"
                >
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="flex items-center gap-2">
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                        {article.tags[0] || "Alert"}
                      </span>
                      {article.source && (
                        <span className="text-muted-foreground">
                          {article.source}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {timeAgo(article.publishedAt)}
                      </span>
                      {article.sourceUrl && (
                        <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {article.title}
                  </h5>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {article.summary}
                  </p>
                </a>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* In-Depth Analysis Bottom Row */}
      <div className="border-t border-border pt-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[18px]">analytics</span>
          </span>
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
            In-Depth Intelligence Analysis
          </h3>
        </div>

        {inDepthArticles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm italic text-muted-foreground">
            No analysis briefs match. Adjust your filter settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {inDepthArticles.map((article) => (
              <a
                key={article._id}
                href={article.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group block cursor-pointer overflow-hidden rounded-2xl border border-border bg-card no-underline shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
              >
                <div className="relative h-44 w-full overflow-hidden border-b border-border bg-accent">
                  <img
                    src={article.imageUrl || getFallbackImage(article.tags)}
                    alt={article.imageAlt || "Analysis cover image"}
                    referrerPolicy="no-referrer"
                    className="h-full w-full scale-100 object-cover opacity-90 transition-transform group-hover:scale-105 group-hover:opacity-100"
                    onError={(e) => {
                      const img = e.currentTarget;
                      const fallback = getFallbackImage(article.tags);
                      if (img.src !== fallback) img.src = fallback;
                    }}
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium capitalize text-muted-foreground">
                        {article.tags[0] || "Data Report"} &bull;{" "}
                        {article.readTime}
                      </span>
                      {article.source && (
                        <span className="shrink-0 text-[13px] font-medium text-muted-foreground">
                          {article.source}
                        </span>
                      )}
                    </div>
                    <h4 className="mb-2 text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                      {article.title}
                    </h4>
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {article.summary}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-medium lowercase text-primary"
                        >
                          #{tag.toLowerCase()}
                        </span>
                      ))}
                    </div>
                    {article.sourceUrl && (
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer — Last updated */}
      {articles.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {articles.length} articles from{" "}
            {new Set(articles.map((a) => a.source).filter(Boolean)).size}{" "}
            sources
          </p>
          <p className="text-xs text-muted-foreground">
            Auto-refreshes every 6 hours
          </p>
        </div>
      )}
    </div>
  );
}
