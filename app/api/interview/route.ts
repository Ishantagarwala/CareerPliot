import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import InterviewSession from "@/models/InterviewSession";
import {
  MAX_ROLE_CHARS,
  buildOpeningQuestion,
  clampQuestionCount,
  isInterviewDifficulty,
  isInterviewType,
  type InterviewConfig,
} from "@/lib/interview";
import { rateLimit, rateLimitRetryAfterMs } from "@/lib/security";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

function cleanOptional(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxChars);
  return trimmed || undefined;
}

/** History list: everything the sidebar and the report list need, minus turns. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessions = await InterviewSession.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(40)
      .select("role interviewType difficulty maxQuestions status company scorecard createdAt turns");

    const summaries = sessions.map((item) => ({
      _id: item._id,
      role: item.role,
      interviewType: item.interviewType,
      difficulty: item.difficulty,
      company: item.company,
      status: item.status,
      maxQuestions: item.maxQuestions,
      answered: item.turns.filter((turn) => turn.role === "candidate").length,
      scorecard: item.scorecard
        ? {
            overallScore: item.scorecard.overallScore,
            verdict: item.scorecard.verdict,
          }
        : null,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({ sessions: summaries });
  } catch (error: unknown) {
    console.error("Interview GET error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Starts a session.
 *
 * The opening question is built locally (see `buildOpeningQuestion`), so this
 * route never calls the model: "Start interview" is instant and cannot fail
 * because a provider is down.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const createKey = `interview:create:${userId}`;
    if (!rateLimit(createKey, 20, HOUR)) {
      const minutes = Math.ceil(rateLimitRetryAfterMs(createKey) / 60_000);
      return NextResponse.json(
        {
          message: `You have started 20 interviews this hour. Try again in about ${Math.max(1, minutes)} minute(s).`,
        },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimitRetryAfterMs(createKey) / 1000)) } }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const role = typeof body?.role === "string" ? body.role.trim().slice(0, MAX_ROLE_CHARS) : "";
    if (!role) {
      return NextResponse.json(
        { message: "Tell us which role you are interviewing for." },
        { status: 400 }
      );
    }

    const config: InterviewConfig = {
      role,
      interviewType: isInterviewType(body?.interviewType) ? body.interviewType : "mixed",
      difficulty: isInterviewDifficulty(body?.difficulty) ? body.difficulty : "entry",
      maxQuestions: clampQuestionCount(body?.maxQuestions),
      jobTitle: cleanOptional(body?.jobTitle, 120),
      company: cleanOptional(body?.company, 120),
    };

    await dbConnect();
    const created = await InterviewSession.create({
      userId,
      role: config.role,
      interviewType: config.interviewType,
      difficulty: config.difficulty,
      maxQuestions: config.maxQuestions,
      jobTitle: config.jobTitle,
      company: config.company,
      status: "active",
      turns: [
        {
          role: "interviewer",
          content: buildOpeningQuestion(config),
          createdAt: new Date(),
        },
      ],
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("Interview POST error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
