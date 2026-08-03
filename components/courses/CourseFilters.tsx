"use client";

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
    <div className="bg-card border border-border p-5 space-y-6">
      <h3
        className="font-bold text-sm text-foreground border-b border-border pb-3"
        style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
      >
        Filters
      </h3>

      <div className="space-y-3">
        <span
          className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Difficulty Level
        </span>
        <div className="space-y-2">
          {levelOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              <input
                type="radio"
                name="level"
                value={opt.value}
                checked={level === opt.value}
                onChange={() => setLevel(opt.value)}
                className="h-4 w-4 border-border bg-transparent accent-primary focus:ring-0"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <span
          className="text-[11px] text-muted-foreground uppercase tracking-[0.1em] font-medium block"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Price / Budget
        </span>
        <div className="space-y-2">
          {budgetOptions.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
            >
              <input
                type="radio"
                name="budget"
                value={opt.value}
                checked={budget === opt.value}
                onChange={() => setBudget(opt.value)}
                className="h-4 w-4 border-border bg-transparent accent-primary focus:ring-0"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
