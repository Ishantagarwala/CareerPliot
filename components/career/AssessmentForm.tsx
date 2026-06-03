"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowRight, ArrowLeft, Plus, X } from "lucide-react";

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

  // Custom arrays for multi-step form state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Custom skills input state
  const [skills, setSkills] = useState<SkillItem[]>([
    { name: "Problem Solving", level: "intermediate" },
    { name: "Communication", level: "intermediate" },
  ]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"beginner" | "intermediate" | "advanced">("intermediate");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      goals: "",
    },
  });

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
    "Mathematics",
    "Computer Science",
    "Physics",
    "Chemistry",
    "Biology",
    "English & Literature",
    "Economics & Finance",
    "Business Studies",
    "History & Sociology",
    "Art & Design",
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
    if (skills.length === 0) {
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
          skills: skills,
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
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-border bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Step {step} of 4
          </span>
          {/* Progress bar */}
          <div className="w-2/3 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        <CardTitle className="font-heading text-2xl font-bold tracking-tight">
          {step === 1 && "What are your core interests?"}
          {step === 2 && "Tell us about your career goals"}
          {step === 3 && "What are your favorite subjects?"}
          {step === 4 && "Highlight your current skills"}
        </CardTitle>
        <CardDescription>
          {step === 1 && "Select the domains and topics that excite you the most."}
          {step === 2 && "Describe your aspirations, dream job, or fields you want to work in."}
          {step === 3 && "Which academic/technical subjects do you feel strongest or most interested in?"}
          {step === 4 && "Add your skills and rate your competency. Be honest!"}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="min-h-[220px]">
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
                    className={`flex items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <Label htmlFor="goals">Write down your career aspirations & dreams</Label>
              <textarea
                id="goals"
                placeholder="Example: I want to build a career in technology, specifically working with AI. My dream is to work as an AI researcher or machine learning engineer in a top lab, building intelligent agents that solve climate change..."
                className="w-full min-h-[160px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                {...register("goals")}
              />
              {errors.goals && (
                <p className="text-xs text-destructive mt-1">{errors.goals.message}</p>
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
                    className={`flex items-center justify-center p-3 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
              {/* Skill Input Form */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap items-end border border-border p-4 bg-muted/20 rounded-lg">
                <div className="flex-1 space-y-1.5 min-w-[200px]">
                  <Label htmlFor="skillName">Skill Name</Label>
                  <input
                    id="skillName"
                    type="text"
                    placeholder="e.g. Python coding, Figma design"
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 w-full sm:w-36">
                  <Label htmlFor="skillLevel">Level</Label>
                  <select
                    id="skillLevel"
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value as any)}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <Button type="button" size="sm" onClick={addSkill} className="w-full sm:w-auto h-9">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              {/* Skills List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <Label>Your Added Skills ({skills.length})</Label>
                {skills.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No skills listed yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground border border-border"
                      >
                        <span>{skill.name}</span>
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                          {skill.level}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border mt-6 pt-4">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} disabled={loading}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button type="button" onClick={handleNext}>
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="font-semibold bg-gradient-to-r from-indigo-500 to-purple-600">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                <>
                  Get AI Recommendations
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
