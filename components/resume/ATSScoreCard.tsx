"use client";

interface ATSScoreCardProps {
  analysis?: any;
  loading?: boolean;
  onAnalyze: () => void;
}

const isHackerRankFormat = (analysis: any) =>
  analysis &&
  (typeof analysis.openSource === "number" ||
    typeof analysis.selfProjects === "number" ||
    analysis.tier);

export default function ATSScoreCard({ analysis, loading, onAnalyze }: ATSScoreCardProps) {
  const hr = isHackerRankFormat(analysis);

  return (
    <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            HackerRank Rubric
          </p>
          <h3 className="font-bold text-white">Engineering Score</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="bg-primary text-primary-foreground border-2 border-black px-3 py-2 text-xs font-bold disabled:opacity-40"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {analysis ? (
        <>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-white">{analysis.score ?? 0}</span>
            <span className="text-sm text-[#8e9192] mb-2">{hr ? "/120" : "/100"}</span>
            {analysis.tier && (
              <span className="mb-2 ml-auto text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/30 px-2 py-1">
                {analysis.tier}
              </span>
            )}
          </div>

          {hr ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Open Source", analysis.openSource, 35],
                ["Projects", analysis.selfProjects, 30],
                ["Production", analysis.production, 25],
                ["Skills", analysis.technicalSkills, 10],
              ].map(([label, value, max]) => (
                <div key={label as string} className="border border-[#262626] p-3">
                  <p className="text-[#8e9192]">{label}</p>
                  <p className="text-white font-bold mt-1">
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
                <div key={label as string} className="border border-[#262626] p-3">
                  <p className="text-[#8e9192]">{label}</p>
                  <p className="text-white font-bold mt-1">{value ?? 0}/100</p>
                </div>
              ))}
            </div>
          )}

          {hr && (analysis.bonus > 0 || analysis.deductions > 0) && (
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-400">Bonus +{analysis.bonus ?? 0}</span>
              <span className="text-rose-400">Deductions −{analysis.deductions ?? 0}</span>
            </div>
          )}

          {(analysis.suggestions || []).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-white mb-2">How to improve</h4>
              <ul className="list-disc ml-5 text-sm text-[#c4c7c8] space-y-1">
                {(analysis.suggestions || []).slice(0, 5).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[#8e9192]">
          Run analysis to score open source, projects, production experience, and technical skills
          (HackerRank hiring rubric).
        </p>
      )}
    </div>
  );
}
