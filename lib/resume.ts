export const defaultResumeContent = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
  },
  education: [],
  experience: [],
  projects: [],
  skills: {
    technical: [],
    frameworks: [],
    tools: [],
    soft: [],
  },
  certifications: [],
  customSections: [],
};

export function resumeToPlainText(content: any): string {
  const personal = content?.personalInfo || {};
  const skills = content?.skills || {};

  const sections = [
    `${personal.fullName || ""}\n${personal.email || ""} ${personal.phone || ""} ${personal.location || ""}\n${personal.linkedin || ""} ${personal.github || ""} ${personal.portfolio || ""}`,
    `Summary\n${personal.summary || ""}`,
    `Skills\nTechnical: ${(skills.technical || []).join(", ")}\nFrameworks: ${(skills.frameworks || []).join(", ")}\nTools: ${(skills.tools || []).join(", ")}\nSoft Skills: ${(skills.soft || []).join(", ")}`,
    `Education\n${(content?.education || []).map((item: any) => `${item.degree || ""} ${item.field || ""} at ${item.institution || ""}. ${item.achievements?.join("; ") || ""}`).join("\n")}`,
    `Experience\n${(content?.experience || []).map((item: any) => `${item.title || ""} at ${item.company || ""}. ${(item.bullets || []).join("; ")} Technologies: ${(item.technologies || []).join(", ")}`).join("\n")}`,
    `Projects\n${(content?.projects || []).map((item: any) => `${item.name || ""}: ${item.description || ""}. ${(item.bullets || []).join("; ")} Tech: ${(item.technologies || []).join(", ")}`).join("\n")}`,
    `Certifications\n${(content?.certifications || []).map((item: any) => `${item.name || ""} - ${item.issuer || ""}`).join("\n")}`,
    `Additional Sections\n${(content?.customSections || []).map((section: any) => `${section.title || ""}\n${(section.items || []).map((item: any) => `${item.heading || ""} ${item.subheading || ""} ${(item.bullets || []).join("; ")}`).join("\n")}`).join("\n\n")}`,
  ];

  return sections.join("\n\n").trim();
}

/** HackerRank hiring-agent rubric (open-sourced ATS scoring weights). */
export interface HackerRankAnalysis {
  score: number;
  openSource: number;
  selfProjects: number;
  production: number;
  technicalSkills: number;
  bonus: number;
  deductions: number;
  tier: "Excellent" | "Strong" | "Average" | "Needs Improvement";
  strengths: string[];
  suggestions: string[];
  evidence: {
    openSource: string[];
    selfProjects: string[];
    production: string[];
    technicalSkills: string[];
  };
  bonusItems: string[];
  deductionItems: string[];
  summary: string;
}

export function tierFromScore(score: number): HackerRankAnalysis["tier"] {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

export function normalizeHackerRankAnalysis(
  raw: Partial<HackerRankAnalysis> & Record<string, any>
): HackerRankAnalysis {
  const openSource = clampInt(raw.openSource, 0, 35);
  const selfProjects = clampInt(raw.selfProjects, 0, 30);
  const production = clampInt(raw.production, 0, 25);
  const technicalSkills = clampInt(raw.technicalSkills, 0, 10);
  const bonus = clampInt(raw.bonus, 0, 20);
  const deductions = clampInt(raw.deductions, 0, 20);
  const computed = clampInt(
    openSource + selfProjects + production + technicalSkills + bonus - deductions,
    0,
    120
  );
  const score = typeof raw.score === "number" ? clampInt(raw.score, 0, 120) : computed;

  return {
    score,
    openSource,
    selfProjects,
    production,
    technicalSkills,
    bonus,
    deductions,
    tier: raw.tier && ["Excellent", "Strong", "Average", "Needs Improvement"].includes(raw.tier)
      ? raw.tier
      : tierFromScore(score),
    strengths: asStringArray(raw.strengths),
    suggestions: asStringArray(raw.suggestions || raw.improvements),
    evidence: {
      openSource: asStringArray(raw.evidence?.openSource),
      selfProjects: asStringArray(raw.evidence?.selfProjects),
      production: asStringArray(raw.evidence?.production),
      technicalSkills: asStringArray(raw.evidence?.technicalSkills),
    },
    bonusItems: asStringArray(raw.bonusItems),
    deductionItems: asStringArray(raw.deductionItems),
    summary: typeof raw.summary === "string" ? raw.summary : "",
  };
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function buildHackerRankAnalysisPrompts(resumeText: string) {
  const systemPrompt = `You are a senior engineering recruiter using HackerRank's hiring-agent resume rubric.
Score what the candidate has BUILT and SHIPPED — not keyword stuffing or pedigree alone.

Return ONLY JSON with this exact structure:
{
  "score": 0,
  "openSource": 0,
  "selfProjects": 0,
  "production": 0,
  "technicalSkills": 0,
  "bonus": 0,
  "deductions": 0,
  "tier": "Average",
  "strengths": ["specific strength with evidence"],
  "suggestions": ["specific actionable improvement"],
  "evidence": {
    "openSource": ["evidence bullet"],
    "selfProjects": ["evidence bullet"],
    "production": ["evidence bullet"],
    "technicalSkills": ["evidence bullet"]
  },
  "bonusItems": ["bonus reason (+n)"],
  "deductionItems": ["deduction reason (-n)"],
  "summary": "2-3 sentence recruiter summary"
}

STRICT WEIGHTS (integers only):
- openSource: 0–35 — contributions to external/open-source repos, PRs, community programs (GSoC, etc.)
- selfProjects: 0–30 — personal projects with complexity, live demos, GitHub links, real impact (not tutorials)
- production: 0–25 — internships/jobs/startups with ownership, shipped systems, measurable outcomes
- technicalSkills: 0–10 — demonstrated depth via projects/experience (named tech alone scores low)
- bonus: 0–20 — e.g. GSoC (+5), founder (+5), LinkedIn (+1), portfolio (+2), technical blogs (+3), GirlScript SoC (+3)
- deductions: 0–20 — tutorial-only projects, missing/broken links, generic project names, no proof of work

score = openSource + selfProjects + production + technicalSkills + bonus - deductions (clamp 0–120).
tier: Excellent (≥90), Strong (70–89), Average (50–69), Needs Improvement (<50).
Be honest and evidence-based. Prefer "what they built" over "what they claim".`;

  const userPrompt = `Evaluate this resume with the HackerRank hiring rubric above.\n\nRESUME:\n${resumeText}`;

  return { systemPrompt, userPrompt };
}

/** @deprecated Prefer buildHackerRankAnalysisPrompts — kept as alias for callers. */
export function buildAtsAnalysisPrompts(resumeText: string) {
  return buildHackerRankAnalysisPrompts(resumeText);
}

export function buildJdMatchPrompts(resumeText: string, jobDescription: string) {
  const systemPrompt = `You compare a student resume against a job description.
Return only JSON with this exact structure:
{
  "matchScore": 0,
  "matchedKeywords": ["keyword"],
  "missingKeywords": ["keyword"],
  "recommendedEdits": ["specific edit"],
  "summary": "short explanation"
}`;

  const userPrompt = `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCompare the resume against the job description. Scores must be integers from 0 to 100.`;

  return { systemPrompt, userPrompt };
}

function latexEscape(value: string | undefined): string {
  return (value || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function latexItems(items: string[] = []) {
  const bullets = Array.isArray(items) ? items.filter(Boolean) : [];
  if (bullets.length === 0) {
    return "";
  }

  return `\\resumeItemListStart
${bullets.map((item) => `        \\resumeItem{${latexEscape(item)}}`).join("\n")}
      \\resumeItemListEnd`;
}

export function resumeToLatex(resume: any): string {
  const content = resume?.content || {};
  const personal = content.personalInfo || {};
  const skills = content.skills || {};
  const contactParts = [
    personal.phone,
    personal.email ? `\\href{mailto:${latexEscape(personal.email)}}{\\color{black}\\raisebox{-0.2\\height}\\faEnvelope\\ ${latexEscape(personal.email)}}` : "",
    personal.linkedin ? `\\href{${latexEscape(personal.linkedin)}}{\\color{black}\\raisebox{-0.2\\height}\\faLinkedin\\ ${latexEscape(personal.linkedin)}}` : "",
    personal.github ? `\\href{${latexEscape(personal.github)}}{\\color{black}\\raisebox{-0.2\\height}\\faGithub\\ ${latexEscape(personal.github)}}` : "",
    personal.portfolio ? `\\href{${latexEscape(personal.portfolio)}}{\\color{black}\\raisebox{-0.2\\height}\\faGlobe\\ ${latexEscape(personal.portfolio)}}` : "",
  ].filter(Boolean).join(" ~ ");

  const education = (content.education || []).map((item: any) => `    \\resumeSubheading
      {${latexEscape(item.institution)}}{${latexEscape([item.startDate, item.endDate].filter(Boolean).join(" - "))}}
      {${latexEscape([item.degree, item.field].filter(Boolean).join(" in "))}}{${latexEscape(item.gpa ? `CGPA: ${item.gpa}` : "")}}`).join("\n");

  const experience = (content.experience || []).map((item: any) => `    \\resumeProjectHeading
      {\\textbf{${latexEscape([item.company, item.title].filter(Boolean).join(", "))}}}{${latexEscape([item.startDate, item.current ? "Present" : item.endDate].filter(Boolean).join(" -- "))}}
      \\vspace{-11pt}
      ${latexItems(item.bullets)}`).join("\n      \\vspace{-4pt}\n");

  const projects = (content.projects || []).map((item: any) => `    \\resumeProjectHeading
      {\\textbf{${latexEscape(item.name)}}${item.technologies?.length ? ` $|$ \\emph{${latexEscape(item.technologies.join(", "))}}` : ""}${item.github ? ` $|$ \\href{${latexEscape(item.github)}}{GitHub}` : ""}}{${latexEscape(item.year || "")}}
      \\vspace{-11pt}
      \\resumeItemListStart
        ${item.description ? `\\resumeItem{${latexEscape(item.description)}}` : ""}
${(item.bullets || []).filter(Boolean).map((bullet: string) => `        \\resumeItem{${latexEscape(bullet)}}`).join("\n")}
      \\resumeItemListEnd`).join("\n      \\vspace{-7pt}\n");

  const certifications = (content.certifications || []).map((item: any) => `    \\resumeItem{\\textbf{${latexEscape(item.name)}}${item.issuer ? ` by ${latexEscape(item.issuer)}` : ""}${item.date ? ` (${latexEscape(item.date)})` : ""}}`).join("\n");

  const customSections = (content.customSections || []).map((section: any) => section?.title ? `\\section{${latexEscape(section.title)}}
  \\resumeSubHeadingListStart
${(section.items || []).map((item: any) => `    \\resumeProjectHeading
      {\\textbf{${latexEscape(item.heading)}}${item.subheading ? ` $|$ \\emph{${latexEscape(item.subheading)}}` : ""}}{${latexEscape(item.date)}}
      \\vspace{-11pt}
      ${latexItems(item.bullets)}`).join("\n      \\vspace{-4pt}\n")}
  \\resumeSubHeadingListEnd` : "").join("\n");

  return `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks, colorlinks=true, urlcolor=NavyBlue]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\input{glyphtounicode}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.7in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.4in}
\\addtolength{\\topmargin}{-.92in}
\\addtolength{\\textheight}{1.95in}
\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\titleformat{\\section}{\\vspace{3pt}\\scshape\\raggedright\\large\\bfseries}{}{0em}{}[\\color{black}\\titlerule \\vspace{-8pt}]
\\pdfgentounicode=1
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-7pt}}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-3pt}\\item
  \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & \\textbf{\\small #2} \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-10pt}}
\\newcommand{\\resumeProjectHeading}[2]{\\item
  \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & \\textbf{\\small #2 }\\\\
  \\end{tabular*}\\vspace{-12pt}}
\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}\\vspace{-9pt}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{-9pt}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-9pt}}
\\begin{document}
\\begin{center}
    {\\Huge \\scshape ${latexEscape(personal.fullName || "Your Name")}} \\\\
    \\vspace{1pt}
    \\small ${contactParts}
\\end{center}
\\vspace{-20pt}
${personal.summary ? `\\section{Summary}
\\small{${latexEscape(personal.summary)}}` : ""}
\\section{Education}
  \\resumeSubHeadingListStart
${education}
  \\resumeSubHeadingListEnd
\\section{Skills}
  \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
        \\textbf{Languages}{: ${latexEscape((skills.technical || []).join(", "))}} \\\\
        \\vspace{2pt}
        \\textbf{AI/ML \\& Frameworks}{: ${latexEscape((skills.frameworks || []).join(", "))}} \\\\
        \\vspace{2pt}
        \\textbf{Developer Tools}{: ${latexEscape((skills.tools || []).join(", "))}} \\\\
        \\vspace{2pt}
        \\textbf{Interpersonal}{: ${latexEscape((skills.soft || []).join(", "))}} \\\\
    }}
  \\end{itemize}
  \\vspace{-20pt}
${experience ? `\\section{Experience}
  \\resumeSubHeadingListStart
${experience}
  \\resumeSubHeadingListEnd` : ""}
${projects ? `\\section{Projects}
  \\resumeSubHeadingListStart
${projects}
  \\resumeSubHeadingListEnd` : ""}
${certifications ? `\\section{Certifications}
\\vspace{2pt}
  \\resumeItemListStart
${certifications}
  \\resumeItemListEnd` : ""}
${customSections}
\\end{document}
`;
}
