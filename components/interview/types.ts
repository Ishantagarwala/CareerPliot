export type InterviewType =
  | "behavioral"
  | "technical"
  | "system-design"
  | "hr"
  | "mixed";

export type InterviewDifficulty = "entry" | "mid" | "senior";

export interface InterviewTurn {
  role: "interviewer" | "candidate";
  content: string;
  createdAt?: string;
}

export interface ScoreDimension {
  name: string;
  score: number;
  note: string;
}

export interface InterviewScorecard {
  overallScore: number;
  verdict: string;
  summary: string;
  dimensions: ScoreDimension[];
  strengths: string[];
  improvements: string[];
  practice: string[];
}

export interface InterviewSession {
  _id: string;
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  maxQuestions: number;
  status: "active" | "completed";
  jobTitle?: string;
  company?: string;
  turns: InterviewTurn[];
  scorecard?: InterviewScorecard | null;
  createdAt?: string;
}

export interface InterviewSummary {
  _id: string;
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  company?: string;
  status: "active" | "completed";
  maxQuestions: number;
  answered: number;
  scorecard: { overallScore: number; verdict: string } | null;
  createdAt: string;
}

export interface NewInterviewConfig {
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  company?: string;
  jobTitle?: string;
  maxQuestions: number;
}

export const TYPE_LABELS: Record<InterviewType, string> = {
  mixed: "Mixed",
  behavioral: "Behavioural",
  technical: "Technical",
  "system-design": "System design",
  hr: "HR screen",
};

export const TYPE_HINTS: Record<InterviewType, string> = {
  mixed: "A realistic mix: your background, stories, and how you build.",
  behavioral: "Stories about how you work: conflict, deadlines, failure.",
  technical: "Fundamentals, trade-offs, and decisions in your own projects.",
  "system-design": "Requirements, components, and what you would change.",
  hr: "Motivation, fit, notice period, and salary expectations.",
};

export const DIFFICULTY_LABELS: Record<InterviewDifficulty, string> = {
  entry: "Entry",
  mid: "Mid",
  senior: "Senior",
};

export function scoreTone(score: number): string {
  if (score >= 70) return "text-foreground";
  if (score >= 55) return "text-foreground/80";
  return "text-destructive";
}

export function scoreBarClass(score: number): string {
  if (score >= 70) return "bg-primary";
  if (score >= 55) return "bg-lime-dim";
  return "bg-destructive/70";
}
