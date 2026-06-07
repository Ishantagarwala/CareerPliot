"use client";

interface ATSScoreCardProps {
  analysis?: any;
  loading?: boolean;
  onAnalyze: () => void;
}

export default function ATSScoreCard({ analysis, loading, onAnalyze }: ATSScoreCardProps) {
  return (
    <div className="bg-[#1A1A1A] border border-[#262626] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="text-[11px] text-[#8e9192] uppercase tracking-[0.15em]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            ATS Analyzer
          </p>
          <h3 className="font-bold text-white">Resume Score</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="bg-white text-[#0A0A0A] px-3 py-2 text-xs font-bold disabled:opacity-40"
          style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {analysis ? (
        <>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-bold text-white">{analysis.score ?? 0}</span>
            <span className="text-sm text-[#8e9192] mb-2">/100</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Keywords", analysis.keywordDensity],
              ["Formatting", analysis.formatting],
              ["Readability", analysis.readability],
              ["Impact", analysis.impact],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#262626] p-3">
                <p className="text-[#8e9192]">{label}</p>
                <p className="text-white font-bold mt-1">{value ?? 0}/100</p>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white mb-2">Suggestions</h4>
            <ul className="list-disc ml-5 text-sm text-[#c4c7c8] space-y-1">
              {(analysis.suggestions || []).map((item: string, index: number) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm text-[#8e9192]">
          Run analysis to get ATS compatibility, keyword, formatting, readability, and impact feedback.
        </p>
      )}
    </div>
  );
}
