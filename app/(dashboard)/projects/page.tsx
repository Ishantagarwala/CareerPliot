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
    if (diff === 'beginner') return 'border-green-500/20 text-green-400 bg-green-500/5';
    if (diff === 'intermediate') return 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5';
    return 'border-red-500/20 text-red-400 bg-red-500/5';
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
            <span className="material-symbols-outlined text-[28px]">hub</span>
            Projects & Hackathon Hub
          </h1>
          <p className="text-sm text-[#8e9192] mt-2">
            Build your portfolio with custom project ideas, collaborate in hackathons, and connect with teammates.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#131313] border border-[#262626] p-1 shrink-0">
          <button
            onClick={() => setActiveTab('ideas')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors rounded-none ${
              activeTab === 'ideas' ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Project Ideas
          </button>
          <button
            onClick={() => setActiveTab('hackathons')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors rounded-none ${
              activeTab === 'hackathons' ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Hackathons
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors rounded-none ${
              activeTab === 'teams' ? 'bg-white text-black' : 'text-muted-foreground hover:text-white'
            }`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Team Finder
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'ideas' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-[#131313] border border-[#262626] p-4">
            <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Tailored Portfolio Projects
            </div>
            <button
              onClick={handleGenerateAI}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#262626] bg-[#131313] space-y-4">
              <Code className="h-8 w-8 mx-auto text-[#636565]" />
              <p className="text-sm text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                No project ideas generated yet. Click above to generate tailored ideas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ideas.map((idea) => (
                <div
                  key={idea._id}
                  className="bg-[#131313] border border-[#262626] hover:border-[#404040] transition-colors p-6 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-bold text-base text-white leading-tight">{idea.title}</h3>
                      <span className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 border ${getDifficultyColor(idea.difficulty)}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {idea.difficulty}
                      </span>
                    </div>

                    <p className="text-xs text-[#c4c7c8] leading-relaxed">
                      {idea.description}
                    </p>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Key Features</span>
                      <ul className="list-disc pl-4 text-xs text-[#8e9192] space-y-1">
                        {idea.features.slice(0, 3).map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {idea.technologies.map(tech => (
                        <span
                          key={tech}
                          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#262626] bg-[#0A0A0A] text-[#8e9192]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-[#262626] pt-4 mt-auto text-[10px] text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>Estimated time: {idea.estimatedTime}</span>
                    {idea.isAIGenerated && (
                      <span className="text-indigo-400 flex items-center gap-1 font-semibold">
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
          <div className="text-xs font-bold text-white uppercase tracking-wider bg-[#131313] border border-[#262626] p-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Featured Hackathon Calendar
          </div>

          {hackathonsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : hackathons.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#262626] bg-[#131313] space-y-4">
              <Calendar className="h-8 w-8 mx-auto text-[#636565]" />
              <p className="text-sm text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                No upcoming hackathons registered.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {hackathons.map((hack) => (
                <div
                  key={hack._id}
                  className="bg-[#131313] border border-[#262626] hover:border-[#404040] transition-colors p-6 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base text-white leading-tight">{hack.title}</h3>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">Organized by {hack.organizer}</p>
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 border border-[#262626] text-white bg-[#0A0A0A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {hack.platform}
                      </span>
                    </div>

                    <p className="text-xs text-[#c4c7c8] leading-relaxed">
                      {hack.description}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(hack.startDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {hack.mode === "online" ? "Online" : `${hack.location || "Offline"}`}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-white">
                        Prizes: {hack.prizes}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hack.themes.map(t => (
                        <span key={t} className="text-[9px] border border-[#262626] bg-[#0A0A0A] text-[#8e9192] px-2 py-0.5 uppercase tracking-wider font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <a
                    href={hack.url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 bg-white text-black text-center font-bold text-xs uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors flex items-center justify-center gap-1.5"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
          <div className="flex justify-between items-center bg-[#131313] border border-[#262626] p-4">
            <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Find Teammates or Join Groups
            </div>
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Publish Post
            </button>
          </div>

          {teamsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#262626] bg-[#131313] space-y-4">
              <Users className="h-8 w-8 mx-auto text-[#636565]" />
              <p className="text-sm text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                No active team posts. Be the first to publish one!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {teams.map((post) => (
                <div
                  key={post._id}
                  className="bg-[#131313] border border-[#262626] hover:border-[#404040] transition-colors p-6 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-bold text-base text-white leading-tight">{post.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Posted by {post.userId.name}</p>
                      </div>
                      <span className="text-[10px] text-[#8e9192] uppercase font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Size: {post.currentMembers}/{post.teamSize}
                      </span>
                    </div>

                    <p className="text-xs text-[#c4c7c8] leading-relaxed">
                      {post.description}
                    </p>

                    {post.hackathonId && (
                      <div className="p-2 border border-[#262626] bg-[#0A0A0A] text-xs text-[#8e9192]">
                        <span className="font-bold text-white">Target Event:</span> {post.hackathonId.title}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Skills Needed</span>
                      <div className="flex flex-wrap gap-1.5">
                        {post.lookingFor.map(skill => (
                          <span key={skill} className="text-[9px] border border-[#262626] bg-[#0A0A0A] text-white px-2 py-0.5 uppercase tracking-wider font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[#262626] pt-4 mt-auto flex flex-col space-y-2 text-xs text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <div>
                      <span className="font-bold text-white">Contact Info:</span> {post.contactMethod}
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A1A] border border-[#262626] w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-bold text-lg text-white" style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}>
                Publish Team Post
              </h3>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-muted-foreground hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTeamPost} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Post Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Looking for Web3 Developer for ETHIndia"
                  value={teamTitle}
                  onChange={(e) => setTeamTitle(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Target Hackathon (Optional)
                </label>
                <select
                  value={selectedHackathon}
                  onChange={(e) => setSelectedHackathon(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white focus:border-white focus:outline-none"
                >
                  <option value="">No specific event</option>
                  {hackathons.map(h => (
                    <option key={h._id} value={h._id}>{h.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Detailed Description *
                </label>
                <textarea
                  placeholder="Explain what you are building and what role you want someone to play..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none min-h-[80px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  Skills Looking For * (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., React, Tailwind CSS, Solidity"
                  value={skillsLookingFor}
                  onChange={(e) => setSkillsLookingFor(e.target.value)}
                  className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Total Team Size
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={teamSize}
                    onChange={(e) => setTeamSize(parseInt(e.target.value))}
                    className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white focus:border-white focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-[#8e9192]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Contact Method *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Email or Discord handle"
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="w-full bg-[#131313] border border-[#262626] p-2 text-xs text-white placeholder-[#636565] focus:border-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-[#e2e2e2] transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
