"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Code,
  Calendar,
  Users,
  Plus,
  Loader2,
  ExternalLink,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  Link as LinkIcon
} from "lucide-react";
import { formatHackathonPrize } from "@/lib/formatHackathonPrize";

interface ProjectIdea {
  _id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  technologies: string[];
  estimatedTime: string;
  features: string[];
  isAIGenerated: boolean;
}

interface Hackathon {
  _id: string;
  title: string;
  organizer: string;
  platform: string;
  url: string;
  description: string;
  startDate: string;
  endDate: string;
  mode: 'online' | 'offline' | 'hybrid';
  location?: string;
  prizes: string;
  themes: string[];
  status: 'upcoming' | 'active' | 'completed';
}

interface TeamPost {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  hackathonId?: Hackathon;
  title: string;
  description: string;
  lookingFor: string[];
  teamSize: number;
  currentMembers: number;
  contactMethod: string;
  createdAt: string;
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<'ideas' | 'hackathons' | 'teams'>('ideas');
  
  // Data states
  const [ideas, setIdeas] = useState<ProjectIdea[]>([]);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [teams, setTeams] = useState<TeamPost[]>([]);

  // Loading states
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [hackathonsLoading, setHackathonsLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Team Finder Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamTitle, setTeamTitle] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState("");
  const [skillsLookingFor, setSkillsLookingFor] = useState("");
  const [teamSize, setTeamSize] = useState(3);
  const [contactMethod, setContactMethod] = useState("");

  const fetchIdeas = useCallback(async () => {
    setIdeasLoading(true);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load project ideas");
      const data = await res.json();
      setIdeas(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIdeasLoading(false);
    }
  }, []);

  const fetchHackathons = useCallback(async () => {
    setHackathonsLoading(true);
    try {
      const res = await fetch("/api/projects?mode=hackathons");
      if (!res.ok) throw new Error("Failed to load hackathons");
      const data = await res.json();
      setHackathons(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setHackathonsLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch("/api/projects/teams");
      if (!res.ok) throw new Error("Failed to load team posts");
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ideas') fetchIdeas();
    if (activeTab === 'hackathons') fetchHackathons();
    if (activeTab === 'teams') {
      fetchTeams();
      fetchHackathons(); // Also load hackathons to link them in modal dropdown
    }
  }, [activeTab, fetchIdeas, fetchHackathons, fetchTeams]);

  const handleGenerateAI = async () => {
    setGenerating(true);
    toast.info("Generating project ideas with AI...");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate ideas");
      toast.success("New AI Project ideas generated!");
      fetchIdeas();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateTeamPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamTitle || !teamDescription || !skillsLookingFor || !contactMethod) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const res = await fetch("/api/projects/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: teamTitle,
          description: teamDescription,
          hackathonId: selectedHackathon || undefined,
          lookingFor: skillsLookingFor.split(",").map(s => s.trim()),
          teamSize,
          contactMethod
        })
      });
      if (!res.ok) throw new Error("Failed to create team post");
      toast.success("Team post published!");
      setShowTeamModal(false);
      setTeamTitle("");
      setTeamDescription("");
      setSelectedHackathon("");
      setSkillsLookingFor("");
      setContactMethod("");
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'beginner') return 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
    if (diff === 'intermediate') return 'border-amber/40 text-amber-deep dark:text-amber bg-amber/10';
    return 'border-destructive/30 text-destructive bg-destructive/10';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row md:items-end">
        <div>
          <h1 className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </span>
            Projects &amp; Hackathon Hub
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Build your portfolio with custom project ideas, collaborate in hackathons, and connect with teammates.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-muted/50 p-1 shadow-soft">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'ideas' ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Project Ideas
          </button>
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'hackathons' ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hackathons
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'teams' ? 'bg-primary text-primary-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Team Finder
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="text-[13px] font-medium text-muted-foreground">
              Tailored Portfolio Projects
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-soft transition-colors hover:brightness-95 disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {generating ? "Generating..." : "Generate AI Ideas"}
            </button>
          </div>

          {ideasLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ideas.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Code className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mx-auto max-w-md space-y-2">
                <h4 className="text-base font-semibold tracking-tight text-foreground">No project ideas yet</h4>
                <p className="text-sm text-muted-foreground">
                  Generate ideas matched to your career path — then pick one to build.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={generating}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Generating…" : "Generate AI Ideas"}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {ideas.map((idea) => (
                <div
                  key={idea._id}
                  className="flex flex-col justify-between space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-base font-bold leading-tight tracking-tight text-foreground">{idea.title}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getDifficultyColor(idea.difficulty)}`}>
                        {idea.difficulty}
                      </span>
                    </div>

                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {idea.description}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[13px] font-medium text-muted-foreground">Key Features</span>
                      <ul className="list-disc space-y-1 pl-4 text-[13px] text-muted-foreground">
                        {idea.features.slice(0, 3).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {idea.technologies.map(tech => (
                        <span
                          key={tech}
                          className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                    <span>Estimated time: {idea.estimatedTime}</span>
                    {idea.isAIGenerated && (
                      <span className="flex items-center gap-1 font-semibold text-amber">
                        <Sparkles className="h-3 w-3" />
                        AI GEN
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'hackathons' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4 text-[13px] font-medium text-muted-foreground shadow-soft">
            Featured Hackathon Calendar
          </div>

          {hackathonsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hackathons.length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-semibold tracking-tight text-foreground">No hackathons listed</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Check back later, or focus on project ideas while you wait for the next event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {hackathons.map((hack) => (
                <div
                  key={hack._id}
                  className="flex flex-col justify-between space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold leading-tight tracking-tight text-foreground">{hack.title}</h3>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">Organized by {hack.organizer}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {hack.platform}
                      </span>
                    </div>

                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {hack.description}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(hack.startDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hack.mode === "online" ? "Online" : `${hack.location || "Offline"}`}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        Prizes: {formatHackathonPrize(hack.prizes)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {hack.themes.map(t => (
                        <span key={t} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <a
                    href={hack.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                  >
                    View Hackathon / Register
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-soft">
            <div className="text-[13px] font-medium text-muted-foreground">
              Find Teammates or Join Groups
            </div>
            <button
              onClick={() => setShowTeamModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Publish Post
            </button>
          </div>

          {teamsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teams.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mx-auto max-w-md space-y-2">
                <p className="font-semibold tracking-tight text-foreground">No team posts yet</p>
                <p className="text-sm text-muted-foreground">
                  Be the first to publish — find teammates or offer to join a group.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Publish Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {teams.map((post) => (
                <div
                  key={post._id}
                  className="flex flex-col justify-between space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold leading-tight tracking-tight text-foreground">{post.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Posted by {post.userId.name}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                        Size: {post.currentMembers}/{post.teamSize}
                      </span>
                    </div>

                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>

                    {post.hackathonId && (
                      <div className="rounded-xl border border-border bg-muted/40 p-2.5 text-[13px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Target Event:</span> {post.hackathonId.title}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[13px] font-medium text-muted-foreground">Skills Needed</span>
                      <div className="flex flex-wrap gap-1.5">
                        {post.lookingFor.map(skill => (
                          <span key={skill} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium capitalize text-foreground">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col space-y-2 border-t border-border pt-4 text-[13px] text-muted-foreground">
                    <div>
                      <span className="font-semibold text-foreground">Contact Info:</span> {post.contactMethod}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publish Team Post Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lift animate-scale-in">
            <div className="flex items-center justify-between border-b border-border p-6">
              <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                Publish Team Post
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTeamPost} className="space-y-4 p-6">
              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Post Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Looking for Web3 Developer for ETHIndia"
                  value={teamTitle}
                  onChange={(e) => setTeamTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Target Hackathon (Optional)
                </label>
                <select
                  value={selectedHackathon}
                  onChange={(e) => setSelectedHackathon(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                >
                  <option value="">No specific event</option>
                  {hackathons.map(h => (
                    <option key={h._id} value={h._id}>{h.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Detailed Description *
                </label>
                <textarea
                  placeholder="Explain what you are building and what role you want someone to play..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="min-h-[80px] w-full rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-medium text-muted-foreground">
                  Skills Looking For * (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., React, Tailwind CSS, Solidity"
                  value={skillsLookingFor}
                  onChange={(e) => setSkillsLookingFor(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-muted-foreground">
                    Total Team Size
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-muted-foreground">
                    Contact Method *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Email or Discord handle"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
              >
                Publish Post
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
