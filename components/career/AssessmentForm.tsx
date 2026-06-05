"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const assessmentSchema = z.object({
  goals: z.string().min(10, { message: "Please describe your career goals in at least 10 characters." }),
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

interface SkillItem {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
}

interface AssessmentFormProps {
  onSuccess: (recommendations: any[]) => void;
}

export default function AssessmentForm({ onSuccess }: AssessmentFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [skills, setSkills] = useState<SkillItem[]>([
    { name: "Problem Solving", level: "intermediate" },
    { name: "Communication", level: "intermediate" },
  ]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      goals: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/career/assess");
        if (res.ok) {
          const profile = await res.json();
          if (profile) {
            if (profile.interests && profile.interests.length > 0) {
              setSelectedInterests(profile.interests);
            }
            if (profile.subjects && profile.subjects.length > 0) {
              setSelectedSubjects(profile.subjects);
            }
            if (profile.skills && profile.skills.length > 0) {
              const cleanedSkills = profile.skills.map((s: any) => ({
                name: s.name,
                level: s.level,
              }));
              setSkills(cleanedSkills);
            }
            if (profile.goals) {
              setValue("goals", profile.goals);
            }
          }
        }
      } catch (err) {
        console.error("Error loading assessment profile:", err);
      }
    }
    loadProfile();
  }, [setValue]);

  const interestsOptions = [
    "Software Engineering",
    "Artificial Intelligence",
    "Data Science",
    "UI/UX Design",
    "Cybersecurity",
    "Product Management",
    "Digital Marketing",
    "Entrepreneurship",
    "Finance & Accounting",
    "Business Management",
    "Healthcare & Medical",
    "Creative Writing & Media",
  ];

  const subjectsOptions = [
    "Computer Science",
    "Mathematics",
    "Data Structures & Algorithms",
    "Web Development",
    "Database Systems (DBMS)",
    "Computer Networks",
    "Software Engineering",
    "Machine Learning & AI",
    "Discrete Mathematics",
    "Statistics & Probability",
  ];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((item) => item !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const addSkill = () => {
    if (!newSkillName.trim()) {
      toast.warning("Please type a skill name");
      return;
    }
    if (skills.some((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      toast.warning("Skill already added");
      return;
    }
    setSkills([...skills, { name: newSkillName.trim(), level: newSkillLevel }]);
    setNewSkillName("");
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, idx) => idx !== index));
  };

  const handleNext = () => {
    if (step === 1 && selectedInterests.length === 0) {
      toast.error("Please select at least one interest to continue.");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const onSubmit = async (values: AssessmentFormValues) => {
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject in Step 3.");
      setStep(3);
      return;
    }

    // Auto-include typed but unadded skill
    let finalSkills = [...skills];
    if (newSkillName.trim()) {
      const skillToAdd = newSkillName.trim();
      if (!skills.some((s) => s.name.toLowerCase() === skillToAdd.toLowerCase())) {
        finalSkills.push({ name: skillToAdd, level: newSkillLevel });
        setSkills((prev) => [...prev, { name: skillToAdd, level: newSkillLevel }]);
        setNewSkillName("");
      }
    }

    if (finalSkills.length === 0) {
      toast.error("Please list at least one skill in Step 4.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/career/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: selectedInterests,
          goals: values.goals,
          subjects: selectedSubjects,
          skills: finalSkills,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      toast.success("Assessment compiled! Processing AI recommendations.");
      onSuccess(data.recommendations);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit assessment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#1A1A1A] border border-[#262626] overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-6 border-b border-[#262626]">
        <div className="flex justify-between items-center mb-4">
          <span
            className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Step {step} of 4
          </span>
          {/* Progress bar */}
          <div className="w-2/3 h-1 bg-[#262626] overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        <h2
          className="text-2xl font-bold text-white tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {step === 1 && "What are your core interests?"}
          {step === 2 && "Tell us about your career goals"}
          {step === 3 && "What are your favorite subjects?"}
          {step === 4 && "Highlight your current skills"}
        </h2>
        <p className="text-sm text-[#8e9192] mt-2">
          {step === 1 && "Select the domains and topics that excite you the most."}
          {step === 2 && "Describe your aspirations, dream job, or fields you want to work in."}
          {step === 3 && "Which academic/technical subjects do you feel strongest or most interested in?"}
          {step === 4 && "Add your skills and rate your competency. Be honest!"}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="p-6 min-h-[240px]">
          {/* STEP 1: Interests */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {interestsOptions.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`flex items-center justify-center p-3 border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-white text-[#0A0A0A] border-white"
                        : "bg-transparent border-[#262626] text-[#c4c7c8] hover:border-[#404040] hover:text-white"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: Goals */}
          {step === 2 && (
            <div className="space-y-4">
              <label
                htmlFor="goals"
                className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Career Aspirations
              </label>
              <textarea
                id="goals"
                placeholder="Example: I want to build a career in technology, specifically working with AI. My dream is to work as an AI researcher or machine learning engineer..."
                className="w-full min-h-[160px] border border-[#262626] bg-[#131313] p-4 text-sm text-white placeholder:text-[#636565] focus:border-white focus:ring-0 focus:outline-none transition-colors resize-none"
                {...register("goals")}
              />
              {errors.goals && (
                <p className="text-xs text-[#ffb4ab] mt-1">{errors.goals.message}</p>
              )}
            </div>
          )}

          {/* STEP 3: Subjects */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {subjectsOptions.map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`flex items-center justify-center p-3 border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-white text-[#0A0A0A] border-white"
                        : "bg-transparent border-[#262626] text-[#c4c7c8] hover:border-[#404040] hover:text-white"
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 4: Skills */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Skill Input */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap items-end p-4 border border-[#262626] bg-[#131313]">
                <div className="flex-1 space-y-1.5 min-w-[200px]">
                  <label
                    htmlFor="skillName"
                    className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Skill Name
                  </label>
                  <input
                    id="skillName"
                    type="text"
                    placeholder="e.g. Python, Figma"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    className="w-full border border-[#262626] bg-transparent px-3 py-1.5 text-sm text-white placeholder:text-[#636565] focus:border-white focus:ring-0 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5 w-full sm:w-36">
                  <label
                    htmlFor="skillLevel"
                    className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Level
                  </label>
                  <select
                    id="skillLevel"
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value as any)}
                    className="w-full border border-[#262626] bg-[#131313] px-3 py-1.5 text-sm text-white focus:border-white focus:ring-0 focus:outline-none"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addSkill}
                  className="w-full sm:w-auto h-9 px-4 bg-white text-[#0A0A0A] font-bold text-xs hover:bg-[#e2e2e2] transition-colors flex items-center justify-center gap-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add
                </button>
              </div>

              {/* Skills List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <span
                  className="text-[11px] text-[#8e9192] uppercase tracking-[0.1em] font-medium block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Your Skills ({skills.length})
                </span>
                {skills.length === 0 ? (
                  <p className="text-sm text-[#636565]">No skills listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 border border-[#262626] px-3 py-1 text-sm text-[#c4c7c8]"
                      >
                        <span>{skill.name}</span>
                        <span
                          className="text-[10px] text-white bg-[#262626] px-1.5 py-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                        >
                          {skill.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="text-[#636565] hover:text-[#ffb4ab] transition-colors ml-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-[#262626] p-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="inline-flex items-center px-5 py-2 border border-[#262626] text-[#c4c7c8] hover:border-white hover:text-white transition-colors text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center px-5 py-2 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              Next
              <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 bg-white text-[#0A0A0A] font-bold hover:bg-[#e2e2e2] transition-colors text-xs disabled:opacity-50"
              style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  Get AI Recommendations
                  <span className="material-symbols-outlined text-[16px] ml-1.5">arrow_forward</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
