import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import InterviewSession from "@/models/InterviewSession";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import {
  buildScorecardPrompts,
  configFromSession,
  countAnsweredQuestions,
  normalizeScorecard,
} from "@/lib/interview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scores a finished interview.
 *
 * Idempotent: if a scorecard already exists it is returned instead of paying
 * for a second opinion. Without this, a double-click or a retried request would
 * overwrite the report the student had already read with a different one.
 */
export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    await dbConnect();
    const interview = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    if (interview.scorecard && interview.status === "completed") {
      return NextResponse.json({ session: interview.toObject(), alreadyScored: true });
    }

    const answered = countAnsweredQuestions(interview.turns);
    if (answered === 0) {
      return NextResponse.json(
        { message: "Answer at least one question before asking for feedback." },
        { status: 400 }
      );
    }

    const limited = enforceLlmBudget(session.user.id, "interview-report", 12);
    if (limited) return limited;

    const config = configFromSession(interview);
    const prompts = buildScorecardPrompts({
      config,
      turns: interview.turns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    });

    let raw: unknown;
    try {
      raw = await generateStructuredJson<unknown>(prompts.system, prompts.user);
    } catch (llmError) {
      console.error("Interview scorecard LLM error:", llmError);
      return NextResponse.json(
        {
          message:
            "The report could not be generated just now. Your answers are saved — try again in a moment.",
        },
        { status: 502 }
      );
    }

    interview.scorecard = normalizeScorecard(raw, { questionCount: answered });
    interview.status = "completed";
    await interview.save();

    return NextResponse.json({ session: interview.toObject(), alreadyScored: false });
  } catch (error: unknown) {
    console.error("Interview finish error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
