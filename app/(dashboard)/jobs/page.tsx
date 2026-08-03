"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  Check,
} from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

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
  { id: "saved", name: "Saved", color: "border-black text-foreground bg-secondary/15 dark:border-blue-500/40 dark:text-blue-300 dark:bg-blue-500/10" },
  { id: "applied", name: "Applied", color: "border-black text-foreground bg-amber-500/15 dark:border-yellow-500/40 dark:text-yellow-300 dark:bg-yellow-500/10" },
  { id: "screening", name: "Screening", color: "border-black text-foreground bg-orange-500/15 dark:border-orange-500/40 dark:text-orange-300 dark:bg-orange-500/10" },
  { id: "interview", name: "Interviewing", color: "border-black text-foreground bg-electric/15 dark:border-purple-500/40 dark:text-purple-300 dark:bg-purple-500/10" },
  { id: "offer", name: "Offers", color: "border-black text-foreground bg-primary/20 dark:border-green-500/40 dark:text-green-300 dark:bg-green-500/10" },
  { id: "rejected", name: "Archived", color: "border-black text-foreground bg-destructive/10 dark:border-red-500/40 dark:text-red-300 dark:bg-red-500/10" },
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
    <div className="space-y-8 animate-fade-in-up text-foreground">
      <div className="border-b-2 border-black pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 font-display">
            <span className="material-symbols-outlined text-[28px]">work</span>
            Internship & Job Center
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Live openings from Remotive, Arbeitnow, RemoteOK
            {meta?.enabledProviders?.some((p) => p.includes("JSearch"))
              ? ", plus LinkedIn/Indeed via JSearch"
              : ""}
            {meta?.careerPath ? (
              <>
                {" "}
                · tailored to <span className="text-foreground font-medium">{meta.careerPath}</span>
              </>
            ) : null}
            .
          </p>
        </div>

        <div className="flex bg-card border-2 border-black p-1 shrink-0">
          <button
            onClick={() => setActiveTab("board")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors font-label ${
              activeTab === "board"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Job Board
          </button>
          <button
            onClick={() => setActiveTab("tracker")}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors font-label flex items-center gap-2 ${
              activeTab === "tracker"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Application Tracker
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </div>

      {activeTab === "board" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-2 border-black p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
                className="w-full bg-background border-2 border-black py-2 pl-9 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors font-label"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-background border-2 border-black py-2 px-3 text-xs font-bold text-foreground uppercase focus:outline-none font-label"
              >
                <option value="all">All Types</option>
                <option value="internship">Internship</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="contract">Contract</option>
              </select>

              <button
                onClick={fetchJobs}
                className="px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity font-label"
              >
                Search
              </button>
            </div>
          </div>

          {meta && (
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground font-label">
              <span className="border-2 border-black bg-card px-2 py-1 text-foreground">
                Query: {meta.query || "—"}
              </span>
              <span className="border-2 border-black bg-card px-2 py-1 text-foreground">
                {meta.count ?? listings.length} results
              </span>
              {meta.sources &&
                Object.entries(meta.sources)
                  .filter(([, n]) => n > 0)
                  .map(([name, n]) => (
                    <span key={name} className="border-2 border-black bg-card px-2 py-1 text-foreground">
                      {name}: {n}
                    </span>
                  ))}
            </div>
          )}

          {meta?.note && (
            <p className="text-[11px] text-muted-foreground border-2 border-dashed border-black p-3 bg-card">
              {meta.note} Add <code className="text-foreground font-semibold">RAPIDAPI_KEY</code> to{" "}
              <code className="text-foreground font-semibold">.env.local</code> for LinkedIn/Indeed-sourced roles via JSearch.
            </p>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
              <span className="text-xs text-muted-foreground font-label">
                Scanning Remotive, Arbeitnow, RemoteOK…
              </span>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-black bg-card space-y-4">
              <Briefcase className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-label">
                No jobs matched. Try a broader search or switch type to All.
              </p>
              <button
                onClick={() => {
                  setSelectedType("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase font-label"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map((job) => {
                const tracked = isTracked(job);
                const skills = Array.isArray(job.skills) ? job.skills : [];
                return (
                  <div
                    key={job._id}
                    className="bg-card border-2 border-black hover:shadow-[4px_4px_0_0_#000] transition-shadow p-6 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <SafeImage
                          src={job.companyLogo}
                          alt={job.company}
                          fallbackName={job.company}
                          className="h-10 w-10 object-contain bg-background p-0.5 border-2 border-black shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-base text-foreground leading-tight line-clamp-2">
                              {job.title}
                            </h3>
                            {job.matchScore !== undefined && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 border-2 border-black shrink-0 font-label tracking-wider",
                                  job.matchScore >= 80
                                    ? "bg-primary/25 text-foreground"
                                    : job.matchScore >= 65
                                      ? "bg-amber-400/30 text-foreground"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                {job.matchScore}% MATCH
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold mt-1">{job.company}</p>
                          {job.source && (
                            <p className="text-[10px] text-foreground mt-1 font-label uppercase tracking-wider font-bold">
                              via <span className="bg-primary text-primary-foreground px-1">{job.source}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground font-label">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location} {job.remote ? "(Remote)" : ""}
                        </span>
                        {job.salary && (job.salary.min || job.salary.max) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {job.salary.min ? `${job.salary.currency || ""} ${job.salary.min.toLocaleString()}` : ""}
                            {job.salary.max ? ` – ${job.salary.max.toLocaleString()}` : ""}
                          </span>
                        )}
                        <span className="capitalize border-2 border-black px-1.5 ml-auto text-[9px] font-bold text-foreground bg-background">
                          {job.type}
                        </span>
                      </div>

                      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                        {job.description || "No description provided."}
                      </p>

                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <p className="text-[10px] text-foreground font-label flex items-center gap-1.5 pt-1.5 font-semibold">
                          <Check className="h-3 w-3 text-foreground shrink-0" />
                          Matches: {job.matchedSkills.join(", ")}
                        </p>
                      )}

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {skills.slice(0, 8).map((skill) => (
                            <span
                              key={skill}
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-black bg-background text-foreground font-label"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 border-t-2 border-black pt-4 mt-auto">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 bg-primary text-primary-foreground border-2 border-black font-bold hover:opacity-90 transition-opacity text-center text-xs font-label"
                      >
                        Apply Directly
                      </a>
                      <button
                        onClick={() => handleSaveJob(job)}
                        disabled={tracked}
                        className={`px-3 py-2 border-2 text-xs font-bold transition-all font-label ${
                          tracked
                            ? "border-black/40 text-muted-foreground cursor-not-allowed bg-muted"
                            : "border-black text-foreground bg-background hover:bg-secondary hover:text-secondary-foreground"
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
          <div className="flex justify-between items-center bg-card border-2 border-black p-4">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider font-label">
              Visual Job Pipeline
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity font-label"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Job
            </button>
          </div>

          {trackerLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
              {statusColumns.map((col) => {
                const colApps = applications.filter((app) => app.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="w-72 shrink-0 bg-card border-2 border-black p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center border-b-2 border-black pb-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border-2 font-label ${col.color}`}
                      >
                        {col.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-bold">{colApps.length}</span>
                    </div>

                    <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[500px]">
                      {colApps.length === 0 ? (
                        <div className="text-center py-8 px-2 space-y-1">
                          <p className="text-[11px] text-muted-foreground font-medium">Nothing here yet</p>
                          <p className="text-[10px] text-muted-foreground/80">
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
                              className="bg-background border-2 border-black hover:shadow-[3px_3px_0_0_#000] transition-shadow p-4 space-y-3 relative group"
                            >
                              <div>
                                <h4 className="font-bold text-sm text-foreground leading-tight">{title}</h4>
                                <p className="text-xs text-muted-foreground font-semibold mt-1">{company}</p>
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t-2 border-black">
                                <select
                                  value={app.status}
                                  onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                                  className="bg-card border-2 border-black py-1 px-1.5 text-[9px] font-bold text-foreground uppercase focus:outline-none font-label"
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
                                    className="text-[10px] text-foreground font-bold hover:text-secondary flex items-center gap-0.5 font-label"
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card border-2 border-black w-full max-w-md overflow-hidden animate-scale-in shadow-[8px_8px_0_0_#000]">
            <div className="p-6 border-b-2 border-black flex justify-between items-center">
              <h3 className="font-bold text-lg text-foreground font-display">
                Add Custom Job to Tracker
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-muted-foreground hover:text-foreground">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomJob} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-label">
                  Job Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Developer Intern"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-background border-2 border-black p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-label">
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Google"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full bg-background border-2 border-black p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-label">
                  Job URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g., https://careers.google.com/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-background border-2 border-black p-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-primary-foreground border-2 border-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity font-label"
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
