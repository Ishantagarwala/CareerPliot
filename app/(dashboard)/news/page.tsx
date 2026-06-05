"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Search, ArrowRight, Newspaper, Calendar, Clock, Filter } from "lucide-react";

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
}

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Fetch articles on mount
  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setArticles(data);
      } catch (err) {
        toast.error("Failed to retrieve tech intelligence news");
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  // Filter items client-side for rapid instant response
  const filteredArticles = articles.filter((article) => {
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = activeTag 
      ? article.tags.some(t => t.toLowerCase() === activeTag.toLowerCase()) 
      : true;

    return matchesSearch && matchesTag;
  });

  // Extract featured, live feed, and analysis items
  const featuredArticle = filteredArticles.find(a => a.category === "Featured");
  const liveFeedArticles = filteredArticles.filter(a => a.category === "Live Feed");
  const inDepthArticles = filteredArticles.filter(a => a.category === "In-Depth Analysis");

  // Get unique tags list for filter buttons
  const allTags = Array.from(new Set(articles.flatMap(a => a.tags)));

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="border-b border-[#262626] pb-6">
          <div className="h-8 w-48 bg-[#1A1A1A] mb-2 animate-pulse" />
          <div className="h-4 w-80 bg-[#1A1A1A] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-[#1A1A1A] border border-[#262626] h-[500px] animate-pulse" />
          <div className="lg:col-span-4 bg-[#1A1A1A] border border-[#262626] h-[500px] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="border-b border-border pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">newspaper</span>
            Daily Dispatch
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            High-signal intelligence on India's tech ecosystem, executive career movements, and policy updates. Cut through the noise.
          </p>
        </div>

        {/* Search & Tag Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Custom Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search Intelligence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border py-2 pl-9 pr-4 text-xs font-semibold focus:border-primary focus:bg-background placeholder-muted-foreground transition-colors rounded-none"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-2 border text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0 rounded-none ${!activeTag ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border text-foreground hover:border-primary"}`}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              All News
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`px-3 py-2 border text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0 rounded-none ${activeTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border text-foreground hover:border-primary"}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Asymmetric Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Featured Article Showcase (Span 8) */}
        <div className="lg:col-span-8">
          {featuredArticle ? (
            <article className="border border-border bg-card flex flex-col group h-full transition-colors duration-300">
              <div className="h-[300px] sm:h-[380px] w-full bg-accent relative overflow-hidden">
                <img
                  src={featuredArticle.imageUrl}
                  alt={featuredArticle.imageAlt || "Featured image"}
                  className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-85 transition-opacity duration-500 mix-blend-luminosity scale-100 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4">
                  <span
                    className="bg-background border border-border px-2.5 py-1 text-[10px] font-bold text-foreground uppercase tracking-widest"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Featured Brief
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8 flex flex-col flex-grow bg-card">
                <div
                  className="flex items-center gap-4 text-muted-foreground text-[10px] font-bold uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Today
                  </span>
                  <span className="w-1.5 h-1.5 bg-border rounded-full" />
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {featuredArticle.readTime}
                  </span>
                </div>

                <h3
                  className="text-xl sm:text-2xl font-bold text-foreground mb-4 group-hover:text-muted-foreground transition-colors leading-tight"
                  style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
                >
                  {featuredArticle.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-grow">
                  {featuredArticle.summary}
                </p>

                <div className="pt-6 border-t border-border/60 flex items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {featuredArticle.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 border border-border text-muted-foreground text-[9px] uppercase font-bold tracking-wider"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => toast.info(`Brief detail loading: ${featuredArticle.title}`)}
                    className="bg-primary text-primary-foreground font-bold text-[10px] uppercase px-5 py-2.5 hover:opacity-95 transition-opacity flex items-center gap-2 tracking-wider"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Read Brief
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          ) : (
            <div className="h-full border border-dashed border-border bg-card flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
              <Newspaper className="h-8 w-8 mb-2 text-muted-foreground" />
              No featured tech dispatches match your search.
            </div>
          )}
        </div>

        {/* Live Feed Sidebar (Span 4) */}
        <aside className="lg:col-span-4 flex flex-col bg-card border border-border p-5 h-[550px]">
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <h4
              className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Live Feed
            </h4>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">Real-Time Alerts</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/50 pr-1">
            {liveFeedArticles.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs italic">
                No active live alerts match filters.
              </div>
            ) : (
              liveFeedArticles.map((article) => (
                <div
                  key={article._id}
                  onClick={() => toast.info(`Alert Brief: ${article.title}`)}
                  className="py-4 hover:bg-background/20 cursor-pointer transition-all flex flex-col gap-2 group first:pt-0"
                >
                  <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                    <span
                      className="text-primary border border-border px-1.5 py-0.5"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {article.tags[0] || "Alert"}
                    </span>
                    <span className="text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {article.readTime}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-foreground leading-snug group-hover:text-muted-foreground transition-colors">
                    {article.title}
                  </h5>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>

      {/* In-Depth Analysis Bottom Row */}
      <div className="pt-8 border-t border-border">
        <div className="mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-foreground text-lg">analytics</span>
          <h3
            className="text-lg font-bold text-foreground tracking-tight"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            In-Depth Intelligence Analysis
          </h3>
        </div>

        {inDepthArticles.length === 0 ? (
          <div className="border border-dashed border-border bg-card p-6 text-center text-muted-foreground text-sm italic">
            No analysis briefs match. Adjust your filter settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inDepthArticles.map((article) => (
              <div
                key={article._id}
                onClick={() => toast.info(`Analysis Document: ${article.title}`)}
                className="border border-border bg-card flex flex-col group cursor-pointer hover:border-muted-foreground transition-all duration-300"
              >
                {article.imageUrl && (
                  <div className="h-44 w-full bg-accent overflow-hidden border-b border-border relative">
                    <div className="absolute inset-0 bg-background/20 group-hover:bg-transparent transition-colors z-10" />
                    <img
                      src={article.imageUrl}
                      alt={article.imageAlt || "Analysis cover image"}
                      className="w-full h-full object-cover grayscale opacity-50 mix-blend-screen scale-100 group-hover:scale-103 transition-transform"
                    />
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span
                      className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {article.tags[0] || "Data Report"} &bull; {article.readTime}
                    </span>
                    <h4 className="text-base font-bold text-foreground mb-2 leading-snug group-hover:text-muted-foreground transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>
                  </div>

                  <div className="flex gap-1.5 flex-wrap pt-4 mt-4 border-t border-border/40">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        #{tag.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
