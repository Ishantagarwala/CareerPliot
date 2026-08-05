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
            className="flex flex-col items-center justify-center p-6 border-2 border-black bg-card hover:bg-primary hover:text-primary-foreground transition-all rounded-[5px] text-center space-y-4 group cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            <span className="material-symbols-outlined text-[40px] text-primary group-hover:text-primary-foreground">keyboard</span>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary-foreground">Option A: Type Answers</h3>
              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                Answer structured forms and select options.
              </p>
            </div>
          </button>

          {/* Option B: Voice */}
          <button
            onClick={startVoiceMode}
            className="flex flex-col items-center justify-center p-6 border-2 border-black bg-card hover:bg-red-500 hover:text-white transition-all rounded-[5px] text-center space-y-4 group cursor-pointer hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000]"
          >
            <span className="material-symbols-outlined text-[40px] text-red-500 group-hover:text-white animate-pulse">mic</span>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-white">Option B: Talk to AI</h3>
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
            Step {step} of {totalSteps}
          </span>
          {/* Progress bar */}
          <div className="w-full sm:w-2/3 h-1.5 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
        <h2
          className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
          style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
        >
          {step === 1 && "Which career domain fits you?"}
          {step === 2 && "What are your core interests?"}
          {step === 3 && "Tell us about your career goals"}
          {step === 4 && "What are your favorite subjects?"}
          {step === 5 && "Highlight your current skills"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          {step === 1 && "Pick a primary domain — or Other for niche paths like hospitality, sports, trades, and more."}
          {step === 2 && "Select the topics that excite you most within this domain."}
          {step === 3 && "Describe your aspirations, dream job, or fields you want to work in."}
          {step === 4 && "Which academic subjects do you feel strongest or most interested in?"}
          {step === 5 && "Add your skills and rate your competency. Be honest!"}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className="p-6 sm:p-8 min-h-[320px]">
          {/* STEP 1: Domain */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DOMAIN_LIST.map((domain) => {
                  const isSelected = careerDomain === domain.id;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => selectDomain(domain.id)}
                      className={`flex flex-col items-start gap-1 p-4 border-2 text-left transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:border-primary/60"
                      }`}
                    >
                      <span className="text-sm font-bold">{domain.label}</span>
                      <span
                        className={`text-xs ${
                          isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                        }`}
                      >
                        {domain.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {careerDomain === "other" && (
                <div className="space-y-3 border-2 border-border p-4 bg-background">
                  <label
                    className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Describe your niche
                  </label>
                  <input
                    type="text"
                    value={careerNiche}
                    onChange={(e) => setCareerNiche(e.target.value)}
                    placeholder="e.g. Hotel management, commercial pilot, organic farming, cricket coaching..."
                    className="w-full border-2 border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={loadNicheCatalog}
                    disabled={loadingNiche}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold border-2 border-border disabled:opacity-50"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
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
                  className="flex-1 border-2 border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomChip(customInterest, selectedInterests, setSelectedInterests, () =>
                      setCustomInterest("")
                    )
                  }
                  className="px-4 py-2 border-2 border-border bg-primary text-primary-foreground text-xs font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Goals */}
          {step === 3 && (
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
                placeholder={goalPlaceholder}
                className="w-full min-h-[220px] border-2 border-border bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-0 focus:outline-none transition-colors resize-none"
                {...register("goals")}
              />
              {errors.goals && (
                <p className="text-xs text-destructive mt-1">{errors.goals.message}</p>
              )}
            </div>
          )}

          {/* STEP 4: Subjects */}
          {step === 4 && (
            <div className="space-y-4">
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
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
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
                  className="flex-1 border-2 border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    addCustomChip(customSubject, selectedSubjects, setSelectedSubjects, () =>
                      setCustomSubject("")
                    )
                  }
                  className="px-4 py-2 border-2 border-border bg-primary text-primary-foreground text-xs font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
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
                    placeholder={`e.g. ${skillSuggestions.slice(0, 2).join(", ")}`}
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

              {skillSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skillSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setNewSkillName(suggestion);
                      }}
                      className="text-[11px] border border-border px-2 py-1 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

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

          {step < totalSteps ? (
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
        <div className="absolute inset-0 z-50 bg-card flex flex-col items-center justify-center p-6 text-center space-y-6">

          {/* Spinning Ring — neo-brutalist style */}
          <div className="relative h-20 w-20 flex items-center justify-center">
            <svg viewBox="0 0 50 50" className="w-full h-full fill-none stroke-primary animate-spin-slow" strokeWidth="3">
              <circle cx="25" cy="25" r="20" strokeDasharray="30,10" />
              <circle cx="25" cy="25" r="13" strokeDasharray="12,8" className="opacity-50" />
            </svg>
            <span className="absolute material-symbols-outlined text-[28px] text-primary animate-pulse">radar</span>
          </div>

          <div className="space-y-5 max-w-sm z-10 w-full">
            <div
              className="text-[10px] tracking-[0.3em] text-primary uppercase font-extrabold animate-pulse"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Generating Roadmap...
            </div>

            {/* Staged Checklist — neo-brutalist card */}
            <div
              className="space-y-2.5 text-xs text-left min-w-[240px] mx-auto border-2 border-black bg-background shadow-[4px_4px_0_0_#000] p-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
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
                        ? "text-foreground font-bold"
                        : isPassed
                        ? "text-muted-foreground"
                        : "text-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[15px] ${
                        isPassed ? "text-primary" : isActive ? "text-primary animate-spin" : "text-muted-foreground/30"
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
              <div className="mt-2 animate-scale-in text-center space-y-1 border-2 border-black p-3 bg-primary shadow-[3px_3px_0_0_#000]">
                <div
                  className="text-[9px] text-primary-foreground tracking-[0.25em] uppercase font-bold"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  CAREERPILOT
                </div>
                <div
                  className="text-primary-foreground text-xs font-extrabold tracking-widest"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
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
