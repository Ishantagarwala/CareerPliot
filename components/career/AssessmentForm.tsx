"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useVoice } from "@/components/voice/useVoice";
import VoiceHUD from "@/components/voice/VoiceHUD";
import {
  DOMAIN_LIST,
  getDomainConfig,
  isCareerDomain,
  type CareerDomain,
} from "@/lib/careerDomains";

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

const INTERVIEW_QUESTIONS: Record<string, string[]> = {
  "en-IN": [
    "Hi! I'm CareerPilot. Let's discover the career path that fits you. What subjects, activities, or types of problems do you genuinely enjoy?",
    "Great. What are your main career goals? If you have a dream job or field you want to work in, describe it.",
    "Interesting! What academic subjects do you feel strongest or most interested in?",
    "Lastly, what are your main skills — technical, creative, analytical, or soft skills — and what do you consider your biggest strengths?"
  ],
  "hi-IN": [
    "नमस्ते! मैं करियरपायलट हूँ। आइए आपके लिए सही करियर पथ की खोज करें। आपको किन विषयों, गतिविधियों या समस्याओं में वास्तविक रूप से आनंद आता है?",
    "समझ गया। आपके मुख्य करियर लक्ष्य क्या हैं? यदि आपका कोई सपनों का काम या क्षेत्र है, तो उसका वर्णन करें।",
    "रोचक! आप किन शैक्षणिक विषयों में सबसे अधिक मजबूत या रुचि महसूस करते हैं?",
    "अंत में, आपके मुख्य कौशल क्या हैं — तकनीकी, रचनात्मक, विश्लेषणात्मक या सॉफ्ट स्किल — और आप अपनी सबसे बड़ी ताकत क्या मानते हैं?"
  ],
  "bn-IN": [
    "নমস্কার! আমি ক্যারিয়ারপাইলট। চলুন আপনার জন্য সঠিক ক্যারিয়ার পথটি খুঁজে বের করি। আপনি কোন বিষয়, ক্রিয়াকলাপ বা সমস্যার ধরণগুলি সত্যিই উপভোগ করেন?",
    "বুঝতে পারলাম। আপনার প্রধান ক্যারিয়ারের লক্ষ্যগুলি কী কী? যদি আপনার কোনো স্বপ্নের চাকরি বা ক্ষেত্র থাকে, তবে তা বর্ণনা করুন।",
    "আকর্ষণীয়! কোন শিক্ষাগত বিষয়গুলিতে আপনি সবচেয়ে বেশি শক্তিশালী বা আগ্রহী বোধ করেন?",
    "সবশেষে, আপনার প্রধান দক্ষতাগুলি কী কী — প্রযুক্তিগত, সৃজনশীল, বিশ্লেষণাত্মক বা সফট স্কিল — এবং আপনি আপনার সবচেয়ে বড় শক্তি কী বলে মনে করেন?"
  ]
};

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
  const [careerDomain, setCareerDomain] = useState<CareerDomain | null>(null);
  const [careerNiche, setCareerNiche] = useState("");
  const [customInterest, setCustomInterest] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [nicheInterests, setNicheInterests] = useState<string[]>([]);
  const [nicheSubjects, setNicheSubjects] = useState<string[]>([]);
  const [nicheSkills, setNicheSkills] = useState<string[]>([]);
  const [loadingNiche, setLoadingNiche] = useState(false);

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
            if (profile.careerDomain && isCareerDomain(profile.careerDomain)) {
              setCareerDomain(profile.careerDomain);
            }
            if (profile.careerNiche) {
              setCareerNiche(profile.careerNiche);
            }
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

  // Multilingual Question Player effect
  useEffect(() => {
    if (voiceHUDOpen && mode === "voice") {
      const langCode = voice.selectedLanguage.code;
      const questions = INTERVIEW_QUESTIONS[langCode] || INTERVIEW_QUESTIONS["en-IN"];
      const currentQuestion = questions[currentVoiceIndex];
      if (currentQuestion) {
        voice.speakText(currentQuestion);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceHUDOpen, voice.selectedLanguage.code, currentVoiceIndex, mode]);

  const domainConfig = careerDomain ? getDomainConfig(careerDomain) : null;
  const interestsOptions = Array.from(
    new Set([...(domainConfig?.interests || []), ...nicheInterests, ...selectedInterests])
  );
  const subjectsOptions = Array.from(
    new Set([...(domainConfig?.subjects || []), ...nicheSubjects, ...selectedSubjects])
  );
  const skillSuggestions = Array.from(
    new Set([...(domainConfig?.skillSuggestions || []), ...nicheSkills])
  );
  const goalPlaceholder =
    domainConfig?.goalExamples?.[0] ||
    "Example: I want a career that matches my strengths and interests...";

  const totalSteps = 5;

  const selectDomain = (domain: CareerDomain) => {
    const next = getDomainConfig(domain);
    setCareerDomain(domain);
    if (domain !== "other") {
      setCareerNiche("");
      setNicheInterests([]);
      setNicheSubjects([]);
      setNicheSkills([]);
      setSelectedInterests((prev) => prev.filter((item) => next.interests.includes(item)));
      setSelectedSubjects((prev) => prev.filter((item) => next.subjects.includes(item)));
    }
  };

  const loadNicheCatalog = async () => {
    if (!careerNiche.trim() || careerNiche.trim().length < 3) {
      toast.error("Describe your niche in a few words first.");
      return;
    }
    setLoadingNiche(true);
    try {
      const res = await fetch("/api/career/niche-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: careerNiche.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate niche catalog");
      setNicheInterests(data.interests || []);
      setNicheSubjects(data.subjects || []);
      setNicheSkills(data.skills || []);
      toast.success("Niche catalog ready — pick interests & subjects next.");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Could not generate niche catalog");
    } finally {
      setLoadingNiche(false);
    }
  };

  const addCustomChip = (
    value: string,
    selected: string[],
    setSelected: (next: string[]) => void,
    clear: () => void
  ) => {
    const chip = value.trim();
    if (!chip) return;
    if (selected.some((item) => item.toLowerCase() === chip.toLowerCase())) {
      toast.warning("Already added");
      return;
    }
    setSelected([...selected, chip]);
    clear();
  };

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
    if (step === 1 && !careerDomain) {
      toast.error("Please select a career domain to continue.");
      return;
    }
    if (step === 1 && careerDomain === "other" && careerNiche.trim().length < 3) {
      toast.error("Describe your niche career (at least a few words) to continue.");
      return;
    }
    if (step === 2 && selectedInterests.length === 0) {
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
  };

  // Voice Assessment submit handler
  const handleVoiceAnswerSubmit = async (text: string) => {
    voice.stopSpeech();
    const langCode = voice.selectedLanguage.code;
    const questions = INTERVIEW_QUESTIONS[langCode] || INTERVIEW_QUESTIONS["en-IN"];
    
    const updatedAnswers = [
      ...voiceAnswers, 
      { question: questions[currentVoiceIndex], answer: text }
    ];
    setVoiceAnswers(updatedAnswers);
    voice.setTranscript("");

    if (currentVoiceIndex < questions.length - 1) {
      const nextIdx = currentVoiceIndex + 1;
      setCurrentVoiceIndex(nextIdx);
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
            careerDomain: careerDomain || undefined,
            careerNiche: careerNiche || undefined,
            interests: profileData.interests?.length
              ? profileData.interests
              : ["Career Exploration"],
            goals: profileData.goals || "I want to explore career options that match my interests and strengths.",
            subjects: profileData.subjects?.length
              ? profileData.subjects
              : ["General Studies"],
            skills: profileData.skills?.length
              ? profileData.skills
              : [{ name: "Problem Solving", level: "intermediate" }],
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
    if (!careerDomain) {
      toast.error("Please select a career domain in Step 1.");
      setStep(1);
      return;
    }

    if (selectedSubjects.length === 0) {
      toast.error("Please select at least one subject in Step 4.");
      setStep(4);
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
          careerDomain,
          careerNiche: careerNiche || undefined,
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
      <div className="animate-fade-in-up mx-auto w-full max-w-2xl space-y-8 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10">
        <div className="space-y-3 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Choose Your Protocol
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Choose how you want to discover your optimal career trajectories.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Option A: Type */}
          <button
            onClick={() => setMode("type")}
            className="group flex cursor-pointer flex-col items-center justify-center space-y-4 rounded-xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-lift"
          >
            <span className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-[26px] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">keyboard</span>
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-foreground">Option A: Type Answers</h3>
              <p className="text-[13px] text-muted-foreground">
                Answer structured forms and select options.
              </p>
            </div>
          </button>

          {/* Option B: Voice */}
          <button
            onClick={startVoiceMode}
            className="group flex cursor-pointer flex-col items-center justify-center space-y-4 rounded-xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-0.5 hover:border-amber/50 hover:bg-accent/50 hover:shadow-lift"
          >
            <span className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-[26px] text-accent-foreground transition-colors group-hover:bg-amber group-hover:text-primary-foreground">
              <span className="animate-pulse">mic</span>
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-foreground">Option B: Talk to AI</h3>
              <p className="text-[13px] text-muted-foreground">
                Conducted as an interactive AI voice interview.
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-soft animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-border p-6 sm:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="shrink-0 text-[13px] font-medium text-muted-foreground">
            Step {step} of {totalSteps}
          </span>
          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:w-2/3">
            <div
              className="progress-bar-fill h-full w-full rounded-full bg-primary transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${step / totalSteps})` }}
            />
          </div>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {step === 1 && "Which career domain fits you?"}
          {step === 2 && "What are your core interests?"}
          {step === 3 && "Tell us about your career goals"}
          {step === 4 && "What are your favorite subjects?"}
          {step === 5 && "Highlight your current skills"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {step === 1 && "Pick a primary domain — or Other for niche paths like hospitality, sports, trades, and more."}
          {step === 2 && "Select the topics that excite you most within this domain."}
          {step === 3 && "Describe your aspirations, dream job, or fields you want to work in."}
          {step === 4 && "Which academic subjects do you feel strongest or most interested in?"}
          {step === 5 && "Add your skills and rate your competency. Be honest!"}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="min-h-[320px] p-6 sm:p-8">
          {/* STEP 1: Domain */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DOMAIN_LIST.map((domain) => {
                  const isSelected = careerDomain === domain.id;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => selectDomain(domain.id)}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-sm font-semibold">{domain.label}</span>
                      <span
                        className={`text-xs ${
                          isSelected ? "text-primary/80" : "text-muted-foreground"
                        }`}
                      >
                        {domain.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {careerDomain === "other" && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <label
                    className="block text-[13px] font-medium text-muted-foreground"
                  >
                    Describe your niche
                  </label>
                  <input
                    type="text"
                    value={careerNiche}
                    onChange={(e) => setCareerNiche(e.target.value)}
                    placeholder="e.g. Hotel management, commercial pilot, organic farming, cricket coaching..."
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  />
                  <button
                    type="button"
                    onClick={loadNicheCatalog}
                    disabled={loadingNiche}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-50"
                  >
                    {loadingNiche ? "Generating chips..." : "Generate niche interests & subjects"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Interests */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {interestsOptions.map((interest) => {
                  const isSelected = selectedInterests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`flex items-center justify-center rounded-full border px-3.5 py-2.5 text-center text-[13px] font-medium transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomChip(customInterest, selectedInterests, setSelectedInterests, () =>
                        setCustomInterest("")
                      );
                    }
                  }}
                  placeholder="Add your own interest..."
                  className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomChip(customInterest, selectedInterests, setSelectedInterests, () =>
                      setCustomInterest("")
                    )
                  }
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Goals */}
          {step === 3 && (
            <div className="max-w-4xl space-y-4">
              <label
                htmlFor="goals"
                className="block text-[13px] font-medium text-muted-foreground"
              >
                Career Aspirations
              </label>
              <textarea
                id="goals"
                placeholder={goalPlaceholder}
                className="w-full min-h-[220px] resize-none rounded-lg border border-input bg-card p-4 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                {...register("goals")}
              />
              {errors.goals && (
                <p className="mt-1 text-xs text-destructive">{errors.goals.message}</p>
              )}
            </div>
          )}

          {/* STEP 4: Subjects */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {subjectsOptions.map((subject) => {
                  const isSelected = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`flex items-center justify-center rounded-full border px-3.5 py-2.5 text-center text-[13px] font-medium transition-colors ${
                        isSelected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomChip(customSubject, selectedSubjects, setSelectedSubjects, () =>
                        setCustomSubject("")
                      );
                    }
                  }}
                  placeholder="Add your own subject..."
                  className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomChip(customSubject, selectedSubjects, setSelectedSubjects, () =>
                      setCustomSubject("")
                    )
                  }
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Skills */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Skill Input */}
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-nowrap sm:p-5">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <label
                    htmlFor="skillName"
                    className="block text-[13px] font-medium text-muted-foreground"
                  >
                    Skill Name
                  </label>
                  <input
                    id="skillName"
                    type="text"
                    placeholder={`e.g. ${skillSuggestions.slice(0, 2).join(", ")}`}
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  />
                </div>
                <div className="w-full space-y-1.5 sm:w-40">
                  <label
                    htmlFor="skillLevel"
                    className="block text-[13px] font-medium text-muted-foreground"
                  >
                    Level
                  </label>
                  <select
                    id="skillLevel"
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value as any)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={addSkill}
                  className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] sm:w-auto"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add
                </button>
              </div>

              {skillSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setNewSkillName(suggestion);
                      }}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Skills List */}
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                <span className="block text-[13px] font-medium text-muted-foreground">
                  Your Skills ({skills.length})
                </span>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-2 text-sm text-foreground"
                      >
                        <span>{skill.name}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold capitalize text-primary">
                          {skill.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="ml-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)]"
            >
              Next
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  Get AI Recommendations
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
          suggestions={
            currentVoiceIndex === 0
              ? DOMAIN_LIST.map((d) => d.label)
              : currentVoiceIndex === 1
              ? domainConfig?.goalExamples || [
                  "Doctor",
                  "CA / Accountant",
                  "Lawyer",
                  "UX Designer",
                  "Software Engineer",
                  "Teacher",
                ]
              : currentVoiceIndex === 2
              ? subjectsOptions
              : currentVoiceIndex === 3
              ? skillSuggestions
              : []
          }
        />
      )}

      {hudStep > 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center space-y-6 bg-card p-6 text-center">

          {/* Spinning Ring */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <svg viewBox="0 0 50 50" className="animate-spin-slow h-full w-full fill-none stroke-primary" strokeWidth="3">
              <circle cx="25" cy="25" r="20" strokeDasharray="30,10" />
              <circle cx="25" cy="25" r="13" strokeDasharray="12,8" className="opacity-50" />
            </svg>
            <span className="material-symbols-outlined absolute animate-pulse text-[28px] text-primary">radar</span>
          </div>

          <div className="z-10 w-full max-w-sm space-y-5">
            <div className="animate-pulse text-[13px] font-semibold text-primary">
              Generating Roadmap...
            </div>

            {/* Staged Checklist */}
            <div className="mx-auto min-w-[240px] space-y-2.5 rounded-xl border border-border bg-background p-4 text-left text-xs shadow-soft">
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
                  <div
                    key={stage.s}
                    className={`flex items-center gap-2 transition-all duration-300 ${
                      isActive
                        ? "font-semibold text-foreground"
                        : isPassed
                        ? "text-muted-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[15px] ${
                        isPassed ? "text-emerald-600 dark:text-emerald-400" : isActive ? "text-primary animate-spin" : "text-muted-foreground"
                      }`}
                    >
                      {isPassed ? "check_circle" : isActive ? "progress_activity" : "radio_button_unchecked"}
                    </span>
                    <span className={isActive ? "animate-pulse" : ""}>{stage.text}</span>
                  </div>
                );
              })}
            </div>

            {hudStep === 5 && (
              <div className="animate-scale-in mt-2 space-y-1 rounded-xl bg-primary p-3 text-center shadow-soft">
                <div className="text-[11px] font-semibold tracking-wide text-primary-foreground/80">
                  CAREERPILOT
                </div>
                <div className="text-xs font-bold tracking-wide text-primary-foreground">
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
