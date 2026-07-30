"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useVoice } from "@/components/voice/useVoice";
import VoiceHUD from "@/components/voice/VoiceHUD";

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

const INTERVIEW_QUESTIONS = [
  "Hi! I'm CareerPilot. Let's discover the career path that fits you. What subjects, activities, or types of problems do you genuinely enjoy?",
  "Interesting! What academic or technical subjects do you feel strongest or most interested in?",
  "Great. What are your main technical or soft skills that you have practiced or learned so far?",
  "Awesome. What do you consider to be your biggest strengths or talents?",
  "Understood. What are your main career goals? If you have a dream job or field you want to work in, describe it.",
  "That sounds exciting. How would you describe your preferred working style? Do you prefer collaborative teams, fast-paced startups, or independent research?",
  "Got it. Have you worked on any projects, internships, or academic coursework that you are proud of?",
  "Lastly, do you have any preferred career directions in mind?"
];

export default function AssessmentForm({ onSuccess }: AssessmentFormProps) {
  const [mode, setMode] = useState<"choice" | "type" | "voice">("choice");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hudStep, setHudStep] = useState(0);

  // Conversational Voice Assessment States
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const [voiceAnswers, setVoiceAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [voiceHUDOpen, setVoiceHUDOpen] = useState(false);

  const voice = useVoice();

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

  // Start Conversational Voice Mode
  const startVoiceMode = async () => {
    setMode("voice");
    setVoiceAnswers([]);
    setCurrentVoiceIndex(0);
    setVoiceHUDOpen(true);
    voice.setTranscript("");
    // Give speech synthesis a small moment
    setTimeout(() => {
      voice.speakText(INTERVIEW_QUESTIONS[0]);
    }, 200);
  };

  // Voice Assessment submit handler
  const handleVoiceAnswerSubmit = async (text: string) => {
    voice.stopSpeech();
    const updatedAnswers = [...voiceAnswers, { question: INTERVIEW_QUESTIONS[currentVoiceIndex], answer: text }];
    setVoiceAnswers(updatedAnswers);
    voice.setTranscript("");

    if (currentVoiceIndex < INTERVIEW_QUESTIONS.length - 1) {
      const nextIdx = currentVoiceIndex + 1;
      setCurrentVoiceIndex(nextIdx);
      voice.speakText(INTERVIEW_QUESTIONS[nextIdx]);
    } else {
      // Completed interview!
      setVoiceHUDOpen(false);
      setLoading(true);
      setHudStep(1);

      // Start sequential HUD progress transition loading
      const runHudAnimation = async () => {
        await new Promise((r) => setTimeout(r, 800));
        setHudStep(2);
        await new Promise((r) => setTimeout(r, 800));
        setHudStep(3);
        await new Promise((r) => setTimeout(r, 800));
        setHudStep(4);
        await new Promise((r) => setTimeout(r, 800));
        setHudStep(5);
        await new Promise((r) => setTimeout(r, 1200));
      };

      try {
        await voice.speakText(
          "Thanks! I have enough information to understand your profile. Let me analyse your strengths and career interests."
        );

        // 1. Call voice-extract endpoint to get structured profile fields
        const extractRes = await fetch("/api/career/voice-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversation: updatedAnswers }),
        });

        if (!extractRes.ok) {
          throw new Error("Could not extract profile details from your speech.");
        }

        const profileData = await extractRes.json();

        // 2. Call existing Career Recommendations Engine with structured JSON
        const apiPromise = fetch("/api/career/assess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interests: profileData.interests || ["Software Engineering"],
            goals: profileData.goals || "I want to build a career in engineering.",
            subjects: profileData.subjects || ["Computer Science"],
            skills: profileData.skills || [{ name: "Problem Solving", level: "intermediate" }],
          }),
        });

        const [_, res] = await Promise.all([runHudAnimation(), apiPromise]);
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Failed to submit assessment profile");
        }

        toast.success("Mission roadmap loaded successfully!");
        onSuccess(data.recommendations);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed during AI analysis.");
      } finally {
        setLoading(false);
        setHudStep(0);
        setMode("choice");
      }
    }
  };

  const onSubmit = async (values: AssessmentFormValues) => {
    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject in Step 3.");
      setStep(3);
      return;
    }

    // Auto-include typed but unadded skill
    const finalSkills = [...skills];
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
    setHudStep(1);

    // Timeline of HUD step advances
    const runHudAnimation = async () => {
      await new Promise((r) => setTimeout(r, 800));
      setHudStep(2);
      await new Promise((r) => setTimeout(r, 800));
      setHudStep(3);
      await new Promise((r) => setTimeout(r, 800));
      setHudStep(4);
      await new Promise((r) => setTimeout(r, 800));
      setHudStep(5);
      await new Promise((r) => setTimeout(r, 1200));
    };

    try {
      const apiPromise = fetch("/api/career/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: selectedInterests,
          goals: values.goals,
          subjects: selectedSubjects,
          skills: finalSkills,
        }),
      });

      // Wait for both the cinematic HUD steps and the actual API request to finish
      const [_, res] = await Promise.all([runHudAnimation(), apiPromise]);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      toast.success("Mission roadmap loaded successfully!");
      onSuccess(data.recommendations);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit assessment.");
    } finally {
      setLoading(false);
      setHudStep(0);
    }
  };

  if (mode === "choice") {
    return (
      <div className="w-full max-w-2xl mx-auto border-4 border-black bg-card shadow-[8px_8px_0_0_#000] p-6 sm:p-10 space-y-8 animate-fade-in-up">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-display font-extrabold uppercase text-foreground">
            Choose Your Protocol
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Choose how you want to discover your optimal career trajectories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A: Type */}
          <button
            onClick={() => setMode("type")}
            className="flex flex-col items-center justify-center p-6 border-2 border-black bg-white hover:bg-primary text-black transition-all rounded-[5px] text-center space-y-4 group cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            <span className="material-symbols-outlined text-[40px] text-primary group-hover:text-black">keyboard</span>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg">Option A: Type Answers</h3>
              <p className="text-xs text-muted-foreground group-hover:text-black/80">
                Answer structured forms and select options.
              </p>
            </div>
          </button>

          {/* Option B: Voice */}
          <button
            onClick={startVoiceMode}
            className="flex flex-col items-center justify-center p-6 border-2 border-black bg-white hover:bg-red-500 hover:text-white transition-all rounded-[5px] text-center space-y-4 group cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            <span className="material-symbols-outlined text-[40px] text-red-500 group-hover:text-white animate-pulse">mic</span>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg">Option B: Talk to AI</h3>
              <p className="text-xs text-muted-foreground group-hover:text-white/80">
                Conducted as an interactive AI voice interview.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card border-2 border-border overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-6 sm:p-8 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <span
            className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Step {step} of 4
          </span>
          {/* Progress bar */}
          <div className="w-full sm:w-2/3 h-1.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        <h2
          className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {step === 1 && "What are your core interests?"}
          {step === 2 && "Tell us about your career goals"}
          {step === 3 && "What are your favorite subjects?"}
          {step === 4 && "Highlight your current skills"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {step === 1 && "Select the domains and topics that excite you the most."}
          {step === 2 && "Describe your aspirations, dream job, or fields you want to work in."}
          {step === 3 && "Which academic/technical subjects do you feel strongest or most interested in?"}
          {step === 4 && "Add your skills and rate your competency. Be honest!"}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="p-6 sm:p-8 min-h-[320px]">
          {/* STEP 1: Interests */}
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {interestsOptions.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`flex items-center justify-center p-3.5 border-2 text-sm font-medium transition-all text-center ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary/60"
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
            <div className="space-y-4 max-w-4xl">
              <label
                htmlFor="goals"
                className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Career Aspirations
              </label>
              <textarea
                id="goals"
                placeholder="Example: I want to build a career in technology, specifically working with AI. My dream is to work as an AI researcher or machine learning engineer..."
                className="w-full min-h-[220px] border-2 border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors resize-none"
                {...register("goals")}
              />
              {errors.goals && (
                <p className="text-xs text-destructive mt-1">{errors.goals.message}</p>
              )}
            </div>
          )}

          {/* STEP 3: Subjects */}
          {step === 3 && (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {subjectsOptions.map((subject) => {
                const isSelected = selectedSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleSubject(subject)}
                    className={`flex items-center justify-center p-3.5 border-2 text-sm font-medium transition-all text-center ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:border-primary/60"
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
              <div className="flex gap-3 flex-wrap sm:flex-nowrap items-end p-4 sm:p-5 border-2 border-border bg-background">
                <div className="flex-1 space-y-1.5 min-w-[200px]">
                  <label
                    htmlFor="skillName"
                    className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
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
                    className="w-full border-2 border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5 w-full sm:w-40">
                  <label
                    htmlFor="skillLevel"
                    className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Level
                  </label>
                  <select
                    id="skillLevel"
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value as any)}
                    className="w-full border-2 border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-0 focus:outline-none"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addSkill}
                  className="w-full sm:w-auto h-10 px-5 bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1 border-2 border-border"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add
                </button>
              </div>

              {/* Skills List */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                <span
                  className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Your Skills ({skills.length})
                </span>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 border-2 border-border bg-background px-3 py-1.5 text-sm text-foreground"
                      >
                        <span>{skill.name}</span>
                        <span
                          className="text-[10px] text-primary-foreground bg-primary px-1.5 py-0.5"
                          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}
                        >
                          {skill.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1"
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
        <div className="flex justify-between border-t border-border p-6 sm:px-8">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="inline-flex items-center px-5 py-2.5 border-2 border-border text-foreground hover:border-primary transition-colors text-xs"
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
              className="inline-flex items-center px-5 py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors text-xs border-2 border-border"
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
              className="inline-flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors text-xs disabled:opacity-50 border-2 border-border"
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

      {voiceHUDOpen && (
        <VoiceHUD
          status={voice.status}
          transcript={voice.transcript}
          onTranscriptChange={(t) => voice.setTranscript(t)}
          onStartRecord={voice.startRecording}
          onStopRecord={voice.stopRecording}
          onSubmit={handleVoiceAnswerSubmit}
          onCancel={() => {
            voice.stopSpeech();
            setVoiceHUDOpen(false);
            setMode("choice");
          }}
          languages={voice.languages}
          selectedLanguage={voice.selectedLanguage}
          onLanguageChange={(l) => voice.setSelectedLanguage(l)}
        />
      )}

      {hudStep > 0 && (
        <div className="absolute inset-0 z-50 bg-[#070709] flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.04)_0%,rgba(14,165,233,0.04)_50%,transparent_100%)] pointer-events-none" />
          
          {/* Glowing HUD Ring */}
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg viewBox="0 0 50 50" className="w-full h-full text-cyan-400 fill-none stroke-current animate-spin-slow" strokeWidth="2">
              <circle cx="25" cy="25" r="20" strokeDasharray="30,10" />
              <circle cx="25" cy="25" r="14" strokeDasharray="15,8" className="opacity-70" />
            </svg>
            <span className="absolute material-symbols-outlined text-[32px] text-cyan-400 animate-pulse">radar</span>
          </div>

          <div className="space-y-4 max-w-sm z-10">
            <div className="text-[10px] font-mono tracking-[0.3em] text-red-500 uppercase animate-pulse">
              Mission Planning HUD
            </div>
            
            {/* Themed Staged Checklist */}
            <div className="space-y-2.5 font-mono text-xs text-left min-w-[240px] mx-auto border border-[#262626] bg-[#0c0c0e]/95 p-4 rounded-[6px]">
              {[
                { s: 1, text: "Assessment Complete" },
                { s: 2, text: "Analysing Your Skills" },
                { s: 3, text: "Finding Career Matches" },
                { s: 4, text: "Building Your Mission" },
                { s: 5, text: "Career Roadmap Ready" }
              ].map((stage) => {
                const isActive = hudStep === stage.s;
                const isPassed = hudStep > stage.s;
                return (
                  <div key={stage.s} className={`flex items-center gap-2 transition-opacity duration-300 ${isActive ? "text-cyan-400 font-bold" : isPassed ? "text-[#8e9192] opacity-80" : "text-[#404042] opacity-40"}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {isPassed ? "check_circle" : isActive ? "sync" : "radio_button_unchecked"}
                    </span>
                    <span className={isActive ? "animate-pulse" : ""}>{stage.text}</span>
                  </div>
                );
              })}
            </div>

            {hudStep === 5 && (
              <div className="mt-4 animate-scale-in text-center">
                <div className="text-[10px] font-mono text-cyan-400 tracking-wider">
                  CAREERPILOT
                </div>
                <div className="text-white text-xs font-bold font-mono tracking-widest mt-1">
                  Your Career. Your Mission. Your Next Move.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
