import mongoose, {
  Schema,
  Document as MongooseDocument,
  type Model,
} from "mongoose";
import type {
  InterviewDifficulty,
  InterviewScorecard,
  InterviewType,
} from "@/lib/interview";

export interface IInterviewTurn {
  role: "interviewer" | "candidate";
  content: string;
  createdAt: Date;
}

export interface IInterviewSession extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  /** Target role, e.g. "Full Stack Developer". Drives every prompt. */
  role: string;
  interviewType: InterviewType;
  difficulty: InterviewDifficulty;
  /** How many candidate answers the session expects before scoring. */
  maxQuestions: number;
  status: "active" | "completed";
  jobTitle?: string;
  company?: string;
  turns: IInterviewTurn[];
  scorecard?: InterviewScorecard;
  createdAt: Date;
  updatedAt: Date;
}

const TurnSchema = new Schema<IInterviewTurn>(
  {
    role: {
      type: String,
      enum: ["interviewer", "candidate"],
      required: true,
    },
    content: { type: String, required: true, maxlength: 8000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DimensionSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    score: { type: Number, min: 0, max: 100, required: true },
    note: { type: String, default: "", maxlength: 400 },
  },
  { _id: false }
);

const ScorecardSchema = new Schema<InterviewScorecard>(
  {
    overallScore: { type: Number, min: 0, max: 100, required: true },
    verdict: { type: String, default: "", maxlength: 60 },
    summary: { type: String, default: "", maxlength: 1200 },
    dimensions: { type: [DimensionSchema], default: [] },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    practice: { type: [String], default: [] },
  },
  { _id: false }
);

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: { type: String, required: true, maxlength: 80 },
    interviewType: {
      type: String,
      enum: ["behavioral", "technical", "system-design", "hr", "mixed"],
      default: "mixed",
    },
    difficulty: {
      type: String,
      enum: ["entry", "mid", "senior"],
      default: "entry",
    },
    maxQuestions: { type: Number, default: 6, min: 3, max: 12 },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    jobTitle: { type: String, maxlength: 120 },
    company: { type: String, maxlength: 120 },
    turns: { type: [TurnSchema], default: [] },
    scorecard: { type: ScorecardSchema, default: undefined },
  },
  { timestamps: true }
);

// The history list and the "latest report" lookup both sort by recency.
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });

const InterviewSessionModel =
  (mongoose.models.InterviewSession as Model<IInterviewSession> | undefined) ||
  mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);

export default InterviewSessionModel;
