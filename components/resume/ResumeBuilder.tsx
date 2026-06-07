"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { defaultResumeContent } from "@/lib/resume";
import ATSScoreCard from "./ATSScoreCard";
import JDMatcher from "./JDMatcher";
import ResumePreview from "./ResumePreview";

interface ResumeBuilderProps {
  resumeId: string;
}

const emptyExperience = {
  company: "",
  title: "",
  location: "",
  startDate: "",
  endDate: "",
  current: false,
  bullets: [""],
  technologies: [],
};

const emptyProject = {
  name: "",
  description: "",
  technologies: [],
  url: "",
  github: "",
  bullets: [""],
};

const emptyEducation = {
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  gpa: "",
  achievements: [],
};

const emptyCertification = {
  name: "",
  issuer: "",
  date: "",
  url: "",
};

const emptyCustomSection = {
  title: "Achievements",
  items: [
    {
      heading: "",
      subheading: "",
      date: "",
      link: "",
      bullets: [""],
    },
  ],
};

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function ResumeBuilder({ resumeId }: ResumeBuilderProps) {
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function loadResume() {
      try {
        const res = await fetch(`/api/resume/${resumeId}`);
        if (!res.ok) {
          throw new Error("Failed to load resume");
        }
        const data = await res.json();
        setResume({
          ...data,
          content: {
            ...defaultResumeContent,
            ...(data.content || {}),
            skills: {
              ...defaultResumeContent.skills,
              ...(data.content?.skills || {}),
            },
          },
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to load resume");
      } finally {
        setLoading(false);
      }
    }

    loadResume();
  }, [resumeId]);

  const updateContent = (path: string[], value: any) => {
    setResume((prev: any) => {
      const next = structuredClone(prev);
      let target = next.content;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const saveResume = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/resume/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: resume.title,
          template: resume.template,
          content: resume.content,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save resume");
      }
      setResume(await res.json());
      toast.success("Resume saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save resume");
    } finally {
      setSaving(false);
    }
  };

  const analyzeResume = async () => {
    await saveResume();
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/resume/${resumeId}/analyze`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to analyze resume");
      }
      const analysis = await res.json();
      setResume((prev: any) => ({ ...prev, atsAnalysis: analysis }));
      toast.success("ATS analysis complete");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze resume");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-[#8e9192]">Loading resume builder...</div>;
  }

  if (!resume) {
    return <div className="text-sm text-[#ffb4ab]">Resume not found.</div>;
  }

  const content = resume.content;
  const personal = content.personalInfo;

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_520px] gap-8">
      <div className="space-y-6 print:hidden">
        <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <label className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]">Resume Title</label>
              <input
                value={resume.title}
                onChange={(e) => setResume({ ...resume, title: e.target.value })}
                className="block mt-2 bg-[#131313] border border-[#262626] p-3 text-white text-sm w-full md:w-80"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveResume} disabled={saving} className="bg-white text-[#0A0A0A] px-4 py-2 text-xs font-bold">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => window.print()} className="border border-[#404040] text-white px-4 py-2 text-xs font-bold">
                Print / Export
              </button>
              <a href={`/api/resume/${resumeId}/latex`} className="border border-[#404040] text-white px-4 py-2 text-xs font-bold">
                Download .tex
              </a>
            </div>
          </div>
        </div>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <h2 className="font-bold text-white">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["fullName", "email", "phone", "location", "linkedin", "github", "portfolio"].map((field) => (
              <input
                key={field}
                value={personal[field] || ""}
                onChange={(e) => updateContent(["personalInfo", field], e.target.value)}
                placeholder={field.replace(/([A-Z])/g, " $1")}
                className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
            ))}
          </div>
          <textarea
            value={personal.summary || ""}
            onChange={(e) => updateContent(["personalInfo", "summary"], e.target.value)}
            placeholder="Professional summary"
            className="w-full min-h-24 bg-[#131313] border border-[#262626] p-3 text-white text-sm"
          />
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="font-bold text-white">Experience</h2>
            <button onClick={() => updateContent(["experience"], [...content.experience, emptyExperience])} className="text-xs text-white underline">
              Add Experience
            </button>
          </div>
          {content.experience.map((item: any, index: number) => (
            <div key={index} className="border border-[#262626] p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {["title", "company", "location", "startDate", "endDate"].map((field) => (
                  <input
                    key={field}
                    value={item[field] || ""}
                    onChange={(e) => {
                      const next = [...content.experience];
                      next[index] = { ...next[index], [field]: e.target.value };
                      updateContent(["experience"], next);
                    }}
                    placeholder={field}
                    className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
                  />
                ))}
              </div>
              <textarea
                value={(item.bullets || []).join("\n")}
                onChange={(e) => {
                  const next = [...content.experience];
                  next[index] = { ...next[index], bullets: e.target.value.split("\n") };
                  updateContent(["experience"], next);
                }}
                placeholder="One impact bullet per line"
                className="w-full min-h-24 bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
            </div>
          ))}
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="font-bold text-white">Projects</h2>
            <button onClick={() => updateContent(["projects"], [...content.projects, emptyProject])} className="text-xs text-white underline">
              Add Project
            </button>
          </div>
          {content.projects.map((item: any, index: number) => (
            <div key={index} className="border border-[#262626] p-4 space-y-3">
              <input
                value={item.name || ""}
                onChange={(e) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], name: e.target.value };
                  updateContent(["projects"], next);
                }}
                placeholder="Project name"
                className="w-full bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
              <textarea
                value={item.description || ""}
                onChange={(e) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], description: e.target.value };
                  updateContent(["projects"], next);
                }}
                placeholder="Project description"
                className="w-full bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
              <input
                value={(item.technologies || []).join(", ")}
                onChange={(e) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], technologies: splitCsv(e.target.value) };
                  updateContent(["projects"], next);
                }}
                placeholder="Technologies, comma separated"
                className="w-full bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
            </div>
          ))}
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="font-bold text-white">Education</h2>
            <button onClick={() => updateContent(["education"], [...content.education, emptyEducation])} className="text-xs text-white underline">
              Add Education
            </button>
          </div>
          {content.education.map((item: any, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-[#262626] p-4">
              {["institution", "degree", "field", "startDate", "endDate", "gpa"].map((field) => (
                <input
                  key={field}
                  value={item[field] || ""}
                  onChange={(e) => {
                    const next = [...content.education];
                    next[index] = { ...next[index], [field]: e.target.value };
                    updateContent(["education"], next);
                  }}
                  placeholder={field}
                  className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
                />
              ))}
            </div>
          ))}
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <h2 className="font-bold text-white">Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {["technical", "frameworks", "tools", "soft"].map((field) => (
              <input
                key={field}
                value={(content.skills[field] || []).join(", ")}
                onChange={(e) => updateContent(["skills", field], splitCsv(e.target.value))}
                placeholder={`${field} skills, comma separated`}
                className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
            ))}
          </div>
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="font-bold text-white">Certifications</h2>
            <button onClick={() => updateContent(["certifications"], [...content.certifications, emptyCertification])} className="text-xs text-white underline">
              Add Certification
            </button>
          </div>
          {content.certifications.map((item: any, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-[#262626] p-4">
              {["name", "issuer", "date", "url"].map((field) => (
                <input
                  key={field}
                  value={item[field] || ""}
                  onChange={(e) => {
                    const next = [...content.certifications];
                    next[index] = { ...next[index], [field]: e.target.value };
                    updateContent(["certifications"], next);
                  }}
                  placeholder={field}
                  className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
                />
              ))}
            </div>
          ))}
        </section>

        <section className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
          <div className="flex justify-between">
            <h2 className="font-bold text-white">Custom Sections</h2>
            <button onClick={() => updateContent(["customSections"], [...(content.customSections || []), emptyCustomSection])} className="text-xs text-white underline">
              Add Section
            </button>
          </div>
          {(content.customSections || []).map((section: any, sectionIndex: number) => (
            <div key={sectionIndex} className="border border-[#262626] p-4 space-y-3">
              <input
                value={section.title || ""}
                onChange={(e) => {
                  const next = [...(content.customSections || [])];
                  next[sectionIndex] = { ...next[sectionIndex], title: e.target.value };
                  updateContent(["customSections"], next);
                }}
                placeholder="Section title, e.g. Leadership & Activities"
                className="w-full bg-[#131313] border border-[#262626] p-3 text-white text-sm"
              />
              {(section.items || []).map((item: any, itemIndex: number) => (
                <div key={itemIndex} className="border border-[#262626] p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {["heading", "subheading", "date", "link"].map((field) => (
                      <input
                        key={field}
                        value={item[field] || ""}
                        onChange={(e) => {
                          const next = [...(content.customSections || [])];
                          const items = [...(next[sectionIndex].items || [])];
                          items[itemIndex] = { ...items[itemIndex], [field]: e.target.value };
                          next[sectionIndex] = { ...next[sectionIndex], items };
                          updateContent(["customSections"], next);
                        }}
                        placeholder={field}
                        className="bg-[#131313] border border-[#262626] p-3 text-white text-sm"
                      />
                    ))}
                  </div>
                  <textarea
                    value={(item.bullets || []).join("\n")}
                    onChange={(e) => {
                      const next = [...(content.customSections || [])];
                      const items = [...(next[sectionIndex].items || [])];
                      items[itemIndex] = { ...items[itemIndex], bullets: e.target.value.split("\n") };
                      next[sectionIndex] = { ...next[sectionIndex], items };
                      updateContent(["customSections"], next);
                    }}
                    placeholder="One bullet per line"
                    className="w-full min-h-20 bg-[#131313] border border-[#262626] p-3 text-white text-sm"
                  />
                </div>
              ))}
            </div>
          ))}
        </section>

        <ATSScoreCard analysis={resume.atsAnalysis} loading={analyzing} onAnalyze={analyzeResume} />
        <JDMatcher resumeId={resumeId} />
      </div>

      <div className="2xl:sticky 2xl:top-8 self-start print:static">
        <ResumePreview resume={resume} />
      </div>
    </div>
  );
}
