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
