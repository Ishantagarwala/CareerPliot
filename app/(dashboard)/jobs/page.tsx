"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  MapPin,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  Check,
} from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { formatJobSalary } from "@/lib/formatJobSalary";

interface JobListing {
  _id: string;
  title: string;
  company: string;
  companyLogo?: string;
  type: "internship" | "full-time" | "part-time" | "contract";
  location: string;
  remote: boolean;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  skills: string[];
  applyUrl: string;
  source?: string;
  matchScore?: number;
  matchedSkills?: string[];
}

interface Application {
  _id: string;
  jobId?: JobListing;
  externalJobKey?: string;
  customJob?: {
    title: string;
    company: string;
    url?: string;
  };
  status: "saved" | "applied" | "screening" | "interview" | "offer" | "rejected" | "withdrawn";
  appliedDate?: string;
  notes?: string;
  updatedAt: string;
}

interface JobsMeta {
  query?: string;
  careerPath?: string | null;
  count?: number;
  sources?: Record<string, number>;
  enabledProviders?: string[];
  note?: string;
}

const statusColumns = [
  { id: "saved", name: "Saved", color: "border-border bg-muted text-muted-foreground" },
  { id: "applied", name: "Applied", color: "border-amber/40 bg-amber/10 text-amber-deep dark:text-amber" },
  { id: "screening", name: "Screening", color: "border-primary/40 bg-primary/10 text-primary" },
  { id: "interview", name: "Interviewing", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "offer", name: "Offers", color: "border-transparent bg-primary text-primary-foreground" },
  { id: "rejected", name: "Archived", color: "border-destructive/30 bg-destructive/10 text-destructive" },
];

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<"board" | "tracker">("board");
  const [listings, setListings] = useState<JobListing[]>([]);
  const [meta, setMeta] = useState<JobsMeta | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/jobs", window.location.origin);
      if (selectedType !== "all") {
        url.searchParams.append("type", selectedType);
      }
      if (searchQuery.trim()) {
        url.searchParams.append("search", searchQuery.trim());
      }
      const res = await fetch(url.toString());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to load jobs");
      }

      // Support { jobs, meta } and legacy array responses.
      const list = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
      setListings(list);
      setMeta(Array.isArray(data) ? null : data?.meta || null);
    } catch (err: any) {
      setListings([]);
      setMeta(null);
      toast.error(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery]);

  const fetchApplications = useCallback(async () => {
    setTrackerLoading(true);
    try {
      const res = await fetch("/api/jobs/applications");
      if (!res.ok) throw new Error("Failed to load tracker");
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load applications");
    } finally {
      setTrackerLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, [fetchJobs, fetchApplications]);

  const isTracked = (job: JobListing) =>
    applications.some(
      (app) =>
        app.externalJobKey === job._id ||
        app.jobId?._id === job._id ||
        (app.customJob?.url && app.customJob.url === job.applyUrl)
    );

  const handleSaveJob = async (job: JobListing) => {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Live IDs are not Mongo ObjectIds — store as custom + external key.
          externalJobKey: job._id,
          customJob: {
            title: job.title,
            company: job.company,
            url: job.applyUrl,
          },
          status: "saved",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to track job");
      toast.success("Job added to Application Tracker!");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated!");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddCustomJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customCompany) {
      toast.error("Please fill in job title and company");
      return;
    }
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customJob: { title: customTitle, company: customCompany, url: customUrl },
          status: "saved",
        }),
      });
      if (!res.ok) throw new Error("Failed to save custom application");
      toast.success("Custom job added to tracker!");
      setShowCustomModal(false);
      setCustomTitle("");
      setCustomCompany("");
      setCustomUrl("");
      fetchApplications();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">work</span>
            </span>
            Internship &amp; Job Center
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Live openings from Remotive, Arbeitnow, RemoteOK
            {meta?.enabledProviders?.some((p) => p.includes("JSearch"))
              ? ", LinkedIn, and Indeed"
              : ""}
            {meta?.careerPath ? (
              <>
                {" "}
                · tailored to <span className="font-medium text-foreground">{meta.careerPath}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-1 shadow-soft">
          <button
            onClick={() => setActiveTab("board")}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === "board"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Job Board
          </button>
          <button
            onClick={() => setActiveTab("tracker")}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === "tracker"
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Application Tracker
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </div>

      {activeTab === "board" ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
                className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
            </div>

            <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
              >
                <option value="all">All Types</option>
                <option value="internship">Internship</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="contract">Contract</option>
              </select>

              <button
                onClick={fetchJobs}
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                Search
              </button>
            </div>
          </div>

          {meta && (
            <div className="flex flex-wrap gap-2 text-[13px] text-muted-foreground">
              <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
                Query: {meta.query || "—"}
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
                {meta.count ?? listings.length} results
              </span>
              {meta.sources &&
                Object.entries(meta.sources)
                  .filter(([, n]) => n > 0)
                  .map(([name, n]) => (
                    <span key={name} className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
                      {name}: {n}
                    </span>
                  ))}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-[13px] text-muted-foreground">
                Scanning Remotive, Arbeitnow, RemoteOK…
              </span>
            </div>
          ) : listings.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Briefcase className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No jobs matched. Try a broader search or switch type to All.
              </p>
              <button
                onClick={() => {
                  setSelectedType("all");
                  setSearchQuery("");
                }}
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {listings.map((job) => {
                const tracked = isTracked(job);
                const skills = Array.isArray(job.skills) ? job.skills : [];
                return (
                  <div
                    key={job._id}
                    className="flex flex-col justify-between space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <SafeImage
                          src={job.companyLogo}
                          alt={job.company}
                          fallbackName={job.company}
                          className="h-10 w-10 shrink-0 rounded-lg border border-border bg-background object-contain p-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-base font-bold leading-tight tracking-tight text-foreground">
                              {job.title}
                            </h3>
                            {job.matchScore !== undefined && (
                              <span
                                className={cn(
                                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                  job.matchScore >= 80
                                    ? "bg-primary/10 text-primary"
                                    : job.matchScore >= 65
                                      ? "bg-accent text-accent-foreground"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                {job.matchScore}% MATCH
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">{job.company}</p>
                          {job.source && (
                            <p className="mt-1 text-[13px] text-muted-foreground">
                              via <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{job.source}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location} {job.remote ? "(Remote)" : ""}
                        </span>
                        {job.salary && (job.salary.min || job.salary.max) && (
                          <span className="flex items-center gap-1 font-semibold text-foreground">
                            {formatJobSalary(job.salary)}
                          </span>
                        )}
                        <span className="ml-auto rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                          {job.type}
                        </span>
                      </div>

                      <p className="line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                        {job.description || "No description provided."}
                      </p>

                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <p className="flex items-center gap-1.5 pt-1.5 text-[13px] text-foreground">
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          Matches: {job.matchedSkills.join(", ")}
                        </p>
                      )}

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {skills.slice(0, 8).map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                      >
                        Apply Directly
                      </a>
                      <button
                        onClick={() => handleSaveJob(job)}
                        disabled={tracked}
                        className={`inline-flex h-9 items-center rounded-lg border px-4 text-sm font-semibold transition-colors ${
                          tracked
                            ? "cursor-not-allowed border-transparent bg-muted text-muted-foreground"
                            : "border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {tracked ? "Tracked" : "Track"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="text-[13px] font-medium text-muted-foreground">
              Visual Job Pipeline
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Job
            </button>
          </div>

          {trackerLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex select-none items-start gap-4 overflow-x-auto pb-4">
              {statusColumns.map((col) => {
                const colApps = applications.filter((app) => app.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="w-72 shrink-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${col.color}`}
                      >
                        {col.name}
                      </span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">{colApps.length}</span>
                    </div>

                    <div className="max-h-[500px] min-h-[300px] space-y-3 overflow-y-auto">
                      {colApps.length === 0 ? (
                        <div className="space-y-1 px-2 py-8 text-center">
                          <p className="text-[13px] font-medium text-muted-foreground">Nothing here yet</p>
                          <p className="text-xs text-muted-foreground">
                            Save a job from the board or add a custom role.
                          </p>
                        </div>
                      ) : (
                        colApps.map((app) => {
                          const title = app.jobId?.title || app.customJob?.title || "Untitled Job";
                          const company =
                            app.jobId?.company || app.customJob?.company || "Unknown Company";
                          const link = app.jobId?.applyUrl || app.customJob?.url;

                          return (
                            <div
                              key={app._id}
                              className="group relative space-y-3 rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-lift"
                            >
                              <div>
                                <h4 className="text-sm font-bold leading-tight tracking-tight text-foreground">{title}</h4>
                                <p className="mt-1 text-xs font-medium text-muted-foreground">{company}</p>
                              </div>

                              <div className="flex items-center justify-between border-t border-border pt-2">
                                <select
                                  value={app.status}
                                  onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                                  className="rounded-md border border-input bg-card px-1.5 py-1 text-[11px] font-medium capitalize text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                >
                                  {statusColumns.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                  <option value="withdrawn">Withdrawn</option>
                                </select>

                                {link && (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-0.5 text-xs font-semibold text-primary transition-colors hover:text-primary"
                                  >
                                    Link
                                    <ChevronRight className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lift animate-scale-in">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                Add Custom Job to Tracker
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomJob} className="space-y-4 p-6">
              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Job Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Marketing Intern, Nursing Graduate, Analyst"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Apollo Hospitals, Deloitte, Unilever"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Job URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g., https://careers.google.com/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                Track Opportunity
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
