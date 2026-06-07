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

export function buildAtsAnalysisPrompts(resumeText: string) {
  const systemPrompt = `You are an ATS and resume review expert for student resumes.
Return only JSON with this exact structure:
{
  "score": 0,
  "keywordDensity": 0,
  "formatting": 0,
  "readability": 0,
  "impact": 0,
  "strengths": ["specific strength"],
  "suggestions": ["specific improvement"]
}`;

  const userPrompt = `Analyze this resume for ATS compatibility, keyword quality, formatting, readability, and impact metrics. Scores must be integers from 0 to 100.\n\n${resumeText}`;

  return { systemPrompt, userPrompt };
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
