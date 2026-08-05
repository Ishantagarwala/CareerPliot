/**
 * Live job board providers.
 * Free (no key): Remotive, Arbeitnow, RemoteOK
 * Optional keys: Adzuna, JSearch (RapidAPI — aggregates LinkedIn, Indeed, Glassdoor, etc.)
 *
 * LinkedIn does not offer a public jobs search API for third-party apps;
 * JSearch is the standard aggregator used to surface LinkedIn-sourced listings.
 */

import { getDomainConfig } from "@/lib/careerDomains";

export type JobType = "internship" | "full-time" | "part-time" | "contract";

export interface ProviderJob {
  _id: string;
  title: string;
  company: string;
  companyLogo?: string;
  type: JobType;
  location: string;
  remote: boolean;
  salary?: { min?: number; max?: number; currency: string };
  description: string;
  requirements: string[];
  skills: string[];
  applyUrl: string;
  source: string;
  postedAt?: string;
}

export interface JobSearchParams {
  query: string;
  type?: string | null;
  location?: string;
  limitPerSource?: number;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max = 220): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function inferJobType(raw: string | undefined | null, title = ""): JobType {
  const hay = `${raw || ""} ${title}`.toLowerCase();
  if (hay.includes("intern") || hay.includes("werkstudent") || hay.includes("trainee")) {
    return "internship";
  }
  if (hay.includes("part")) return "part-time";
  if (hay.includes("contract") || hay.includes("freelance") || hay.includes("temporary")) {
    return "contract";
  }
  return "full-time";
}

function matchesTypeFilter(job: ProviderJob, type?: string | null): boolean {
  if (!type || type === "all") return true;
  return job.type === type;
}

async function fetchRemotive(params: JobSearchParams): Promise<ProviderJob[]> {
  try {
    const url = new URL("https://remotive.com/api/remote-jobs");
    if (params.query) url.searchParams.set("search", params.query);
    url.searchParams.set("limit", String(params.limitPerSource || 15));

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];

    return jobs.slice(0, params.limitPerSource || 15).map((item: any): ProviderJob => {
      const title = item.title || "Open Role";
      return {
        _id: `remotive-${item.id}`,
        title,
        company: item.company_name || "Company",
        companyLogo: item.company_logo || undefined,
        type: inferJobType(item.job_type, title),
        location: item.candidate_required_location || "Remote",
        remote: true,
        description: truncate(stripHtml(item.description || "")),
        requirements: [],
        skills: Array.isArray(item.tags) ? item.tags.slice(0, 8) : [],
        applyUrl: item.url || item.candidate_required_location || "https://remotive.com",
        source: "Remotive",
        postedAt: item.publication_date,
      };
    });
  } catch (err) {
    console.error("Remotive fetch failed:", err);
    return [];
  }
}

async function fetchArbeitnow(params: JobSearchParams): Promise<ProviderJob[]> {
  try {
    const url = new URL("https://www.arbeitnow.com/api/job-board-api");
    if (params.query) url.searchParams.set("search", params.query);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const jobs = Array.isArray(json?.data) ? json.data : [];

    return jobs.slice(0, params.limitPerSource || 15).map((item: any): ProviderJob => {
      const title = item.title || "Open Role";
      const types = Array.isArray(item.job_types) ? item.job_types.join(" ") : "";
      return {
        _id: `arbeitnow-${item.slug || item.url}`,
        title,
        company: item.company_name || "Company",
        type: inferJobType(types, title),
        location: item.location || "Remote",
        remote: !!item.remote,
        description: truncate(stripHtml(item.description || "")),
        requirements: [],
        skills: Array.isArray(item.tags) ? item.tags.slice(0, 8) : [],
        applyUrl: item.url || "https://www.arbeitnow.com",
        source: "Arbeitnow",
        postedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : undefined,
      };
    });
  } catch (err) {
    console.error("Arbeitnow fetch failed:", err);
    return [];
  }
}

async function fetchRemoteOK(params: JobSearchParams): Promise<ProviderJob[]> {
  try {
    // RemoteOK: first element is metadata; needs a browser-like User-Agent.
    const tag = encodeURIComponent(
      (params.query || "jobs").split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9+#.-]/g, "")
    );
    const url = `https://remoteok.com/api?tags=${tag || "dev"}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CareerPilot/1.0 (educational job board)",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const rows = Array.isArray(json) ? json.slice(1) : [];

    const qTokens = (params.query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const filtered = rows.filter((item: any) => {
      if (qTokens.length === 0) return true;
      const hay = `${item.position || ""} ${item.company || ""} ${(item.tags || []).join(" ")}`.toLowerCase();
      return qTokens.some((t) => hay.includes(t));
    });

    return filtered.slice(0, params.limitPerSource || 15).map((item: any): ProviderJob => {
      const title = item.position || item.title || "Remote Role";
      return {
        _id: `remoteok-${item.id || item.slug}`,
        title,
        company: item.company || "Company",
        companyLogo: item.company_logo || undefined,
        type: inferJobType(Array.isArray(item.tags) ? item.tags.join(" ") : "", title),
        location: item.location || "Worldwide · Remote",
        remote: true,
        salary:
          item.salary_min || item.salary_max
            ? {
                min: item.salary_min || undefined,
                max: item.salary_max || undefined,
                currency: "USD",
              }
            : undefined,
        description: truncate(stripHtml(item.description || item.tags?.join(", ") || "")),
        requirements: [],
        skills: Array.isArray(item.tags) ? item.tags.slice(0, 8) : [],
        applyUrl: item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.slug}`,
        source: "RemoteOK",
        postedAt: item.date || (item.epoch ? new Date(item.epoch * 1000).toISOString() : undefined),
      };
    });
  } catch (err) {
    console.error("RemoteOK fetch failed:", err);
    return [];
  }
}

/** Adzuna — popular job search API (Indeed-style marketplace). Needs ADZUNA_APP_ID + ADZUNA_APP_KEY. */
async function fetchAdzuna(params: JobSearchParams): Promise<ProviderJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  try {
    const country = "in";
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("results_per_page", String(params.limitPerSource || 15));
    url.searchParams.set("what", params.query || "graduate jobs");
    if (params.location) url.searchParams.set("where", params.location);
    url.searchParams.set("content-type", "application/json");

    if (params.type === "internship") {
      url.searchParams.set("what", `${params.query || "internship"}`.trim());
    } else if (params.type === "part-time") {
      url.searchParams.set("part_time", "1");
    } else if (params.type === "full-time") {
      url.searchParams.set("full_time", "1");
    }

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.error("Adzuna failed:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];

    return results.map((item: any): ProviderJob => {
      const title = item.title || "Role";
      const contract = item.contract_time || item.contract_type || "";
      return {
        _id: `adzuna-${item.id}`,
        title,
        company: item.company?.display_name || "Company",
        type: inferJobType(contract, title),
        location: item.location?.display_name || params.location || "India",
        remote: /remote|work from home|wfh/i.test(`${title} ${item.description || ""}`),
        salary:
          item.salary_min || item.salary_max
            ? {
                min: item.salary_min ? Math.round(item.salary_min / 12) : undefined,
                max: item.salary_max ? Math.round(item.salary_max / 12) : undefined,
                currency: item.salary_is_predicted === "1" ? "INR*" : "INR",
              }
            : undefined,
        description: truncate(stripHtml(item.description || "")),
        requirements: [],
        skills: [],
        applyUrl: item.redirect_url || item.adref || "https://www.adzuna.com",
        source: "Adzuna",
        postedAt: item.created,
      };
    });
  } catch (err) {
    console.error("Adzuna fetch failed:", err);
    return [];
  }
}

/**
 * JSearch (RapidAPI) aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter, etc.
 * Set RAPIDAPI_KEY to enable.
 */
async function fetchJSearch(params: JobSearchParams): Promise<ProviderJob[]> {
  const key = process.env.RAPIDAPI_KEY?.trim();
  if (!key) return [];

  try {
    const host = "jsearch.p.rapidapi.com";
    const url = new URL(`https://${host}/search`);
    url.searchParams.set("query", params.query || "graduate jobs");
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "1");
    if (params.type === "internship") {
      url.searchParams.set("query", `${params.query || "internship"}`);
    }
    if (params.location) {
      url.searchParams.set("query", `${params.query || "jobs"} in ${params.location}`);
    }

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": host,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error("JSearch failed:", res.status, await res.text().catch(() => ""));
      return [];
    }

    const json = await res.json();
    const results = Array.isArray(json?.data) ? json.data : [];

    return results.slice(0, params.limitPerSource || 15).map((item: any): ProviderJob => {
      const title = item.job_title || "Role";
      const employer = item.employer_name || "Company";
      const id = item.job_id || `${employer}-${title}`.replace(/\s+/g, "-").toLowerCase();
      return {
        _id: `jsearch-${id}`,
        title,
        company: employer,
        companyLogo: item.employer_logo || undefined,
        type: inferJobType(item.job_employment_type, title),
        location:
          item.job_city && item.job_country
            ? `${item.job_city}, ${item.job_country}`
            : item.job_country || item.job_city || "Remote",
        remote: Boolean(item.job_is_remote),
        salary:
          item.job_min_salary || item.job_max_salary
            ? {
                min: item.job_min_salary || undefined,
                max: item.job_max_salary || undefined,
                currency: item.job_salary_currency || "USD",
              }
            : undefined,
        description: truncate(stripHtml(item.job_description || "")),
        requirements: Array.isArray(item.job_required_skills) ? item.job_required_skills.slice(0, 6) : [],
        skills: Array.isArray(item.job_required_skills)
          ? item.job_required_skills.slice(0, 8)
          : Array.isArray(item.job_highlights?.Qualifications)
            ? item.job_highlights.Qualifications.slice(0, 8)
            : [],
        applyUrl: item.job_apply_link || item.job_google_link || "https://www.linkedin.com/jobs/",
        source: item.job_publisher || "JSearch",
        postedAt: item.job_posted_at_datetime_utc,
      };
    });
  } catch (err) {
    console.error("JSearch fetch failed:", err);
    return [];
  }
}

export function buildJobQuery(opts: {
  search?: string | null;
  careerPath?: string | null;
  skills?: string[];
  careerDomain?: string | null;
  careerNiche?: string | null;
}): string {
  if (opts.search?.trim()) return opts.search.trim();
  const parts: string[] = [];
  if (opts.careerPath) parts.push(opts.careerPath);
  else if (opts.careerNiche?.trim()) parts.push(opts.careerNiche.trim());
  if (opts.skills?.length) parts.push(...opts.skills.slice(0, 3));
  if (parts.length === 0) {
    return getDomainConfig(opts.careerDomain).defaultJobQuery;
  }
  return parts.join(" ");
}

export async function fetchLiveJobs(params: JobSearchParams): Promise<{
  jobs: ProviderJob[];
  sources: Record<string, number>;
  enabled: string[];
}> {
  const limit = params.limitPerSource || 12;

  const enabled = ["Remotive", "Arbeitnow", "RemoteOK"];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) enabled.push("Adzuna");
  if (process.env.RAPIDAPI_KEY?.trim()) {
    enabled.push("JSearch (LinkedIn/Indeed/Glassdoor)");
  }

  const settled = await Promise.allSettled([
    fetchRemotive({ ...params, limitPerSource: limit }),
    fetchArbeitnow({ ...params, limitPerSource: limit }),
    fetchRemoteOK({ ...params, limitPerSource: limit }),
    fetchAdzuna({ ...params, limitPerSource: limit }),
    fetchJSearch({ ...params, limitPerSource: limit }),
  ]);

  const labels = ["Remotive", "Arbeitnow", "RemoteOK", "Adzuna", "JSearch"];
  const sources: Record<string, number> = {};
  const merged: ProviderJob[] = [];
  const seen = new Set<string>();

  settled.forEach((result, idx) => {
    const label = labels[idx];
    const list = result.status === "fulfilled" ? result.value : [];
    sources[label] = list.length;
    for (const job of list) {
      if (!matchesTypeFilter(job, params.type)) continue;
      const key = job.applyUrl || job._id;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
    }
  });

  return { jobs: merged, sources, enabled };
}
