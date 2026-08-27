"use client";

import { getDomainConfig, type CareerDomain } from "@/lib/careerDomains";

interface ATSScoreCardProps {
  analysis?: any;
  loading?: boolean;
  onAnalyze: () => void;
  careerDomain?: CareerDomain | string | null;
}

const isHackerRankFormat = (analysis: any) =>
  analysis &&
  (typeof analysis.openSource === "number" ||
    typeof analysis.selfProjects === "number" ||
    analysis.tier);

export default function ATSScoreCard({
  analysis,
  loading,
  onAnalyze,
  careerDomain,
}: ATSScoreCardProps) {
  const hr = isHackerRankFormat(analysis);
  const domain = getDomainConfig(careerDomain || analysis?.careerDomain);
  const rubric = domain.resumeRubric;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{domain.label} Rubric</p>
          <h3 className="font-bold tracking-tight text-foreground">Career Score</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="inline-flex h-8 shrink-0 items-center self-start rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-[color-mix(in_oklch,var(--primary),black_8%)] disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {analysis ? (
        <>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold tabular-nums tracking-tight text-foreground">{analysis.score ?? 0}</span>
            <span className="mb-1.5 text-sm text-muted-foreground">{hr ? "/120" : "/100"}</span>
            {analysis.tier && (
              <span className="mb-1.5 ml-auto rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {analysis.tier}
              </span>
            )}
          </div>

          {hr ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                [rubric.community.label, analysis.openSource, 35],
                [rubric.portfolio.label, analysis.selfProjects, 30],
                [rubric.experience.label, analysis.production, 25],
                [rubric.skills.label, analysis.technicalSkills, 10],
              ].map(([label, value, max]) => (
                <div key={label as string} className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[13px] font-medium leading-snug text-muted-foreground">{label}</p>
                  <p className="mt-1 font-bold tabular-nums text-foreground">
                    {value ?? 0}/{max}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Keywords", analysis.keywordDensity],
                ["Formatting", analysis.formatting],
                ["Readability", analysis.readability],
                ["Impact", analysis.impact],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
                  <p className="mt-1 font-bold tabular-nums text-foreground">{value ?? 0}/100</p>
                </div>
              ))}
            </div>
          )}

          {hr && (analysis.bonus > 0 || analysis.deductions > 0) && (
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600">
                Bonus +{analysis.bonus ?? 0}
              </span>
              <span className="rounded-md bg-destructive/10 px-2 py-1 font-semibold text-destructive">
                Deductions −{analysis.deductions ?? 0}
              </span>
            </div>
          )}

          {(analysis.suggestions || []).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-foreground">How to improve</h4>
              <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
                {(analysis.suggestions || []).slice(0, 5).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Run analysis to score {rubric.community.label.toLowerCase()},{" "}
          {rubric.portfolio.label.toLowerCase()}, {rubric.experience.label.toLowerCase()}, and{" "}
          {rubric.skills.label.toLowerCase()} for {domain.label}.
        </p>
      )}
    </div>
  );
}
