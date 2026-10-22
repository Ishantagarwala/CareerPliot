import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import InterviewSession from "@/models/InterviewSession";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import {
  MAX_ANSWER_CHARS,
  buildTurnPrompts,
  configFromSession,
  countAnsweredQuestions,
  normalizeInterviewerReply,
} from "@/lib/interview";

export const dynamic = "force-dynamic";
// A reasoning model answering one question can take a while.
export const maxDuration = 60;

const CLOSING_LINE =
  "Thanks — that's everything I wanted to cover. I'll put your feedback together now.";

/**
 * Records an answer and returns the interviewer's next question.
 *
 * Ordering is deliberate: the model is called BEFORE either turn is written.
 * If the provider fails, the session is left exactly as it was and the client
 * keeps the answer in the box — so a retry cannot duplicate the answer in the
 * transcript, which is what would happen if the candidate turn were saved first.
 */
export async function POST(
  req: Request,
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

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const answer = typeof body?.answer === "string" ? body.answer.trim() : "";
    if (!answer) {
      return NextResponse.json({ message: "Write an answer first." }, { status: 400 });
    }
    if (answer.length > MAX_ANSWER_CHARS) {
      return NextResponse.json(
        { message: `That answer is too long (${answer.length} characters). Keep it under ${MAX_ANSWER_CHARS}.` },
        { status: 400 }
      );
    }

    await dbConnect();
    const interview = await InterviewSession.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }
    if (interview.status === "completed") {
      return NextResponse.json(
        { message: "This interview is already scored. Start a new one to keep practising." },
        { status: 409 }
      );
    }

    const answered = countAnsweredQuestions(interview.turns);
    if (answered >= interview.maxQuestions) {
      return NextResponse.json(
        { message: "All questions are answered — generate your feedback." },
        { status: 409 }
      );
    }

    const asked = answered + 1;
    const now = new Date();

    // Last answer of the session: no model call, no dangling question.
    if (asked >= interview.maxQuestions) {
      interview.turns.push({ role: "candidate", content: answer, createdAt: now });
      interview.turns.push({
        role: "interviewer",
        content: CLOSING_LINE,
        createdAt: now,
      });
      await interview.save();
      return NextResponse.json({ session: interview.toObject(), complete: true });
    }

    const limited = enforceLlmBudget(session.user.id, "interview", 40);
    if (limited) return limited;

    const config = configFromSession(interview);
    const prompts = buildTurnPrompts({
      config,
      turns: interview.turns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      answer,
      asked,
    });

    let raw: unknown;
    try {
      raw = await generateStructuredJson<unknown>(prompts.system, prompts.user);
    } catch (llmError) {
      console.error("Interview turn LLM error:", llmError);
      return NextResponse.json(
        {
          message:
            "The interviewer could not respond just now. Your answer was not saved — try sending it again.",
        },
        { status: 502 }
      );
    }

    const reply = normalizeInterviewerReply(raw);
    const content = reply.acknowledgement
      ? `${reply.acknowledgement}\n\n${reply.question}`
      : reply.question;

    interview.turns.push({ role: "candidate", content: answer, createdAt: now });
    interview.turns.push({ role: "interviewer", content, createdAt: new Date() });
    await interview.save();

    return NextResponse.json({ session: interview.toObject(), complete: false });
  } catch (error: unknown) {
    console.error("Interview turn error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
