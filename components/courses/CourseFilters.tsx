"use client";

import { Label } from "@/components/ui/label";

interface CourseFiltersProps {
  level: string;
  setLevel: (level: string) => void;
  budget: string;
  setBudget: (budget: string) => void;
}

export default function CourseFilters({ level, setLevel, budget, setBudget }: CourseFiltersProps) {
  const levelOptions = [
    { label: "All Levels", value: "all" },
    { label: "Beginner", value: "beginner" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];

  const budgetOptions = [
    { label: "All Prices", value: "all" },
    { label: "Free Courses", value: "free" },
    { label: "Paid Courses", value: "paid" },
  ];

  return (
    <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-6">
      <h3 className="font-heading font-bold text-base border-b border-border pb-3">
        Filter Recommendations
      </h3>

      {/* Difficulty level */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Difficulty Level
        </Label>
        <div className="space-y-2">
          {levelOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer"
            >
              <input
                type="radio"
                name="level"
                value={opt.value}
                checked={level === opt.value}
                onChange={() => setLevel(opt.value)}
                className="h-4 w-4 border-border text-primary focus:ring-primary accent-primary"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Price / Budget
        </Label>
        <div className="space-y-2">
          {budgetOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer"
            >
              <input
                type="radio"
                name="budget"
                value={opt.value}
                checked={budget === opt.value}
                onChange={() => setBudget(opt.value)}
                className="h-4 w-4 border-border text-primary focus:ring-primary accent-primary"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
