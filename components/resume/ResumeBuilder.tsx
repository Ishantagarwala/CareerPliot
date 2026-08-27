"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { defaultResumeContent, resumeSkillLabels } from "@/lib/resume";
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

function CsvInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: unknown;
  onChange: (items: string[]) => void;
  placeholder: string;
  className?: string;
}) {
  const initialItems = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? splitCsv(value)
      : [];
  const [draft, setDraft] = useState(initialItems.join(", "));

  return (
    <input
      value={draft}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        onChange(splitCsv(nextDraft));
      }}
      onBlur={() => {
        const normalized = splitCsv(draft);
        setDraft(normalized.join(", "));
        onChange(normalized);
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

const inputClass =
  "h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25";
const textareaClass =
  "w-full rounded-lg border border-input bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25";
const addButtonClass =
  "inline-flex h-8 shrink-0 items-center gap-1 self-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted";
const panelClass = "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft";
const itemPanelClass = "space-y-3 rounded-xl border border-border bg-muted/40 p-4";

export default function ResumeBuilder({ resumeId }: ResumeBuilderProps) {
  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [careerDomain, setCareerDomain] = useState<string | null>(null);
  const skillLabels = resumeSkillLabels(careerDomain);

  useEffect(() => {
    async function loadResume() {
      try {
        const [res, profileRes] = await Promise.all([
          fetch(`/api/resume/${resumeId}`),
          fetch("/api/career/assess"),
        ]);
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
        if (profileRes.ok) {
          const profile = await profileRes.json();
          if (profile?.careerDomain) setCareerDomain(profile.careerDomain);
        }
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
    return <div className="text-sm text-muted-foreground">Loading resume builder...</div>;
  }

  if (!resume) {
    return <div className="text-sm text-destructive">Resume not found.</div>;
  }

  const content = resume.content;
  const personal = content.personalInfo;

  return (
    <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1fr)_520px]">
      <div className="space-y-6 print:hidden">
        <div className={panelClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <label className="text-[13px] font-medium text-muted-foreground">Resume Title</label>
              <input
                value={resume.title}
                onChange={(e) => setResume({ ...resume, title: e.target.value })}
                className="mt-2 block h-10 w-full rounded-lg border border-input bg-card px-3 text-sm font-medium text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 md:w-80"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={saveResume}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Print / Export
              </button>
              <a
                href={`/api/resume/${resumeId}/latex`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download .tex
              </a>
            </div>
          </div>
        </div>

        <section className={panelClass}>
          <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </span>
            Personal Info
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {["fullName", "email", "phone", "location", "linkedin", "github", "portfolio"].map((field) => (
              <input
                key={field}
                value={personal[field] || ""}
                onChange={(e) => updateContent(["personalInfo", field], e.target.value)}
                placeholder={field.replace(/([A-Z])/g, " $1")}
                className={inputClass}
              />
            ))}
          </div>
          <textarea
            value={personal.summary || ""}
            onChange={(e) => updateContent(["personalInfo", "summary"], e.target.value)}
            placeholder="Professional summary"
            className={`${textareaClass} min-h-24`}
          />
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">work</span>
              </span>
              Experience
            </h2>
            <button
              onClick={() => updateContent(["experience"], [...content.experience, emptyExperience])}
              className={addButtonClass}
            >
              Add Experience
            </button>
          </div>
          {content.experience.map((item: any, index: number) => (
            <div key={index} className={itemPanelClass}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    className={inputClass}
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
                className={`${textareaClass} min-h-24`}
              />
            </div>
          ))}
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">folder</span>
              </span>
              Projects
            </h2>
            <button
              onClick={() => updateContent(["projects"], [...content.projects, emptyProject])}
              className={addButtonClass}
            >
              Add Project
            </button>
          </div>
          {content.projects.map((item: any, index: number) => (
            <div key={index} className={itemPanelClass}>
              <input
                value={item.name || ""}
                onChange={(e) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], name: e.target.value };
                  updateContent(["projects"], next);
                }}
                placeholder="Project name"
                className={`${inputClass} w-full`}
              />
              <textarea
                value={item.description || ""}
                onChange={(e) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], description: e.target.value };
                  updateContent(["projects"], next);
                }}
                placeholder="Project description"
                className={textareaClass}
              />
              <CsvInput
                value={item.technologies}
                onChange={(technologies) => {
                  const next = [...content.projects];
                  next[index] = { ...next[index], technologies };
                  updateContent(["projects"], next);
                }}
                placeholder="Technologies, comma separated"
                className={`${inputClass} w-full`}
              />
            </div>
          ))}
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">school</span>
              </span>
              Education
            </h2>
            <button
              onClick={() => updateContent(["education"], [...content.education, emptyEducation])}
              className={addButtonClass}
            >
              Add Education
            </button>
          </div>
          {content.education.map((item: any, index: number) => (
            <div key={index} className={`grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-2`}>
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
                  className={inputClass}
                />
              ))}
            </div>
          ))}
        </section>

        <section className={panelClass}>
          <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">build</span>
            </span>
            Skills
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(["technical", "frameworks", "tools", "soft"] as const).map((field) => (
              <CsvInput
                key={field}
                value={content.skills[field]}
                onChange={(items) => updateContent(["skills", field], items)}
                placeholder={`${skillLabels[field]}, comma separated`}
                className={inputClass}
              />
            ))}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </span>
              Certifications
            </h2>
            <button
              onClick={() => updateContent(["certifications"], [...content.certifications, emptyCertification])}
              className={addButtonClass}
            >
              Add Certification
            </button>
          </div>
          {content.certifications.map((item: any, index: number) => (
            <div key={index} className={`grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/40 p-4 md:grid-cols-2`}>
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
                  className={inputClass}
                />
              ))}
            </div>
          ))}
        </section>

        <section className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-foreground">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
              </span>
              Custom Sections
            </h2>
            <button
              onClick={() => updateContent(["customSections"], [...(content.customSections || []), emptyCustomSection])}
              className={addButtonClass}
            >
              Add Section
            </button>
          </div>
          {(content.customSections || []).map((section: any, sectionIndex: number) => (
            <div key={sectionIndex} className={itemPanelClass}>
              <input
                value={section.title || ""}
                onChange={(e) => {
                  const next = [...(content.customSections || [])];
                  next[sectionIndex] = { ...next[sectionIndex], title: e.target.value };
                  updateContent(["customSections"], next);
                }}
                placeholder="Section title, e.g. Leadership & Activities"
                className={`${inputClass} w-full`}
              />
              {(section.items || []).map((item: any, itemIndex: number) => (
                <div key={itemIndex} className="space-y-3 rounded-lg border border-border bg-card p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                        className={inputClass}
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
                    className={`${textareaClass} min-h-20`}
                  />
                </div>
              ))}
            </div>
          ))}
        </section>

        <ATSScoreCard
          analysis={resume.atsAnalysis}
          loading={analyzing}
          onAnalyze={analyzeResume}
          careerDomain={careerDomain}
        />
        <JDMatcher resumeId={resumeId} />
      </div>

      <div className="self-start 2xl:sticky 2xl:top-8 print:static">
        <ResumePreview resume={resume} careerDomain={careerDomain} />
      </div>
    </div>
  );
}
