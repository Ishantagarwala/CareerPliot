"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Building,
  MapPin,
  DollarSign,
  Search,
  Plus,
  Loader2,
  Calendar,
  Layers,
  Check,
  ChevronRight,
  Notebook
} from "lucide-react";

interface JobListing {
  _id: string;
  title: string;
  company: string;
  companyLogo?: string;
  type: 'internship' | 'full-time' | 'part-time' | 'contract';
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
  matchScore?: number;
  matchedSkills?: string[];
}

interface Application {
  _id: string;
  jobId?: JobListing;
  customJob?: {
    title: string;
    company: string;
    url?: string;
  };
  status: 'saved' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  appliedDate?: string;
  notes?: string;
  updatedAt: string;
}

const statusColumns = [
  { id: 'saved', name: 'Saved', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
  { id: 'applied', name: 'Applied', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' },
  { id: 'screening', name: 'Screening', color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
  { id: 'interview', name: 'Interviewing', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5' },
  { id: 'offer', name: 'Offers', color: 'border-green-500/30 text-green-400 bg-green-500/5' },
  { id: 'rejected', name: 'Archived', color: 'border-red-500/30 text-red-400 bg-red-500/5' }
];

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'board' | 'tracker'>('board');
  const [listings, setListings] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Custom job entry modal states
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
      if (searchQuery) {
        url.searchParams.append("search", searchQuery);
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load jobs");
      const data = await res.json();
      setListings(data);
    } catch (err: any) {
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
      setApplications(data);
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

  const handleSaveJob = async (jobId: string) => {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, status: "saved" }),
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
          status: "saved"
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
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-[#262626] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1
            className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">work</span>
            Internship & Job Center
          </h1>
          <p className="text-sm text-[#8e9192] mt-2">
            Browse targeted internship openings and map your applications onto a visual tracking board.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#131313] border border-[#262626] p-1 shrink-0">
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors rounded-none ${
              activeTab === 'board' ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Job Board
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors rounded-none flex items-center gap-2 ${
              activeTab === 'tracker' ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Application Tracker
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'board' ? (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#131313] border border-[#262626] p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#636565]" />
              <input
                type="text"
                placeholder="Search jobs or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchJobs()}
                className="w-full bg-[#0A0A0A] border border-[#262626] py-2 pl-9 pr-4 text-xs font-semibold focus:border-white focus:outline-none text-white transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                }}
                className="bg-[#0A0A0A] border border-[#262626] py-2 px-3 text-xs font-bold text-white uppercase focus:outline-none"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <option value="all">All Types</option>
                <option value="internship">Internship</option>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
              </select>

              <button
                onClick={fetchJobs}
                className="px-4 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Job Listings Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <span className="text-xs text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Scanning opportunities...
              </span>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#262626] bg-[#131313] space-y-4">
              <Briefcase className="h-8 w-8 mx-auto text-[#636565]" />
              <p className="text-sm text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                No job matching criteria found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {listings.map((job) => {
                const isAlreadyTracked = applications.some(app => app.jobId?._id === job._id);
                return (
                  <div
                    key={job._id}
                    className="bg-[#131313] border border-[#262626] hover:border-[#404040] transition-colors p-6 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      {/* Logo + Company */}
                      <div className="flex items-start gap-4">
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={job.company}
                            className="h-10 w-10 object-contain bg-white p-1 border border-[#262626]"
                          />
                        ) : (
                          <div className="h-10 w-10 border border-[#262626] bg-[#0A0A0A] flex items-center justify-center text-white shrink-0">
                            <Building className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-bold text-base text-white leading-tight truncate">{job.title}</h3>
                            {job.matchScore !== undefined && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-2 py-0.5 border shrink-0 font-mono tracking-wider",
                                  job.matchScore >= 80
                                    ? "border-green-500/30 text-green-400 bg-green-500/5"
                                    : job.matchScore >= 65
                                    ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5"
                                    : "border-zinc-500/30 text-zinc-400 bg-zinc-500/5"
                                )}
                              >
                                {job.matchScore}% MATCH
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold mt-1">{job.company}</p>
                        </div>
                      </div>

                      {/* Meta Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location} {job.remote && "(Remote)"}
                        </span>
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {job.salary.min ? `₹${job.salary.min.toLocaleString()}` : ""}
                            {job.salary.max ? ` - ₹${job.salary.max.toLocaleString()}` : ""} /mo
                          </span>
                        )}
                        <span className="capitalize border border-[#262626] px-1.5 py-0.2 ml-auto text-[9px] font-bold text-white bg-[#0A0A0A]">
                          {job.type}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#c4c7c8] leading-relaxed line-clamp-3">
                        {job.description}
                      </p>

                      {/* Matched Skills Highlight */}
                      {job.matchedSkills && job.matchedSkills.length > 0 && (
                        <p className="text-[10px] text-green-400 font-mono flex items-center gap-1.5 pt-1.5">
                          <Check className="h-3 w-3 text-green-400 shrink-0" />
                          Matches: {job.matchedSkills.join(", ")}
                        </p>
                      )}

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {job.skills.map(skill => (
                          <span
                            key={skill}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#262626] bg-[#0A0A0A] text-[#8e9192]"
                            style={{ fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t border-[#262626] pt-4 mt-auto">
                      <a
                        href={job.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-center text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        Apply Directly
                      </a>
                      <button
                        onClick={() => handleSaveJob(job._id)}
                        disabled={isAlreadyTracked}
                        className={`px-3 py-2 border text-xs font-bold transition-all ${
                          isAlreadyTracked
                            ? 'border-[#262626] text-[#636565] cursor-not-allowed'
                            : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500'
                        }`}
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {isAlreadyTracked ? "Tracked" : "Track Application"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Tracker Kanban View */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[#131313] border border-[#262626] p-4">
            <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Visual Job Pipeline
            </div>
            <button
              onClick={() => setShowCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Custom Job
            </button>
          </div>

          {trackerLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
              {statusColumns.map((col) => {
                const colApps = applications.filter(app => app.status === col.id);
                return (
                  <div
                    key={col.id}
                    className="w-72 shrink-0 bg-[#131313] border border-[#262626] p-4 space-y-4"
                  >
                    {/* Column Header */}
                    <div className="flex justify-between items-center border-b border-[#262626] pb-2">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 border ${col.color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {col.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-bold">{colApps.length}</span>
                    </div>

                    {/* Column Items */}
                    <div className="space-y-3 min-h-[300px] overflow-y-auto max-h-[500px]">
                      {colApps.length === 0 ? (
                        <div className="text-center py-8 text-[11px] text-[#636565] italic">
                          No items here
                        </div>
                      ) : (
                        colApps.map((app) => {
                          const title = app.jobId?.title || app.customJob?.title || "Untitled Job";
                          const company = app.jobId?.company || app.customJob?.company || "Unknown Company";
                          const link = app.jobId?.applyUrl || app.customJob?.url;

                          return (
                            <div
                              key={app._id}
                              className="bg-[#0A0A0A] border border-[#262626] hover:border-[#404040] transition-colors p-4 space-y-3 relative group"
                            >
                              <div>
                                <h4 className="font-bold text-sm text-white leading-tight">{title}</h4>
                                <p className="text-xs text-muted-foreground font-semibold mt-1">{company}</p>
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t border-[#262626]">
                                <select
                                  value={app.status}
                                  onChange={(e) => handleUpdateStatus(app._id, e.target.value)}
                                  className="bg-[#131313] border border-[#262626] py-1 px-1.5 text-[9px] font-bold text-[#8e9192] uppercase focus:outline-none"
                                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                >
                                  {statusColumns.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                  <option value="withdrawn">Withdrawn</option>
                                </select>

                                {link && (
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-0.5"
                                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                                  >
                                    Links
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

      {/* Custom Job Entry Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-[#262626] w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white" style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                Add Custom Job to Tracker
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCustomJob} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Job Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Developer Intern"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Company Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Google"
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Job URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="e.g., https://careers.google.com/..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
