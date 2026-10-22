import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Flashcard from "@/models/Flashcard";
import ReviewLog from "@/models/ReviewLog";
import {
  isReviewRating,
  normalizeSchedulableCard,
  scheduleCard,
} from "@/lib/srs";

export const dynamic = "force-dynamic";

/**
 * Records one answer and reschedules the card.
 *
 * The scheduler is the only writer of the scheduling fields — the client sends
 * a rating, never an interval — so review history cannot be rewritten by a
 * crafted request.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const cardId = typeof body?.cardId === "string" ? body.cardId : "";
    const rating = body?.rating;

    if (!mongoose.isValidObjectId(cardId)) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }
    if (!isReviewRating(rating)) {
      return NextResponse.json(
        { message: "Rating must be one of: again, hard, good, easy." },
        { status: 400 }
      );
    }

    await dbConnect();
    const card = await Flashcard.findOne({ _id: cardId, userId: session.user.id });
    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    const now = new Date();
    const previous = normalizeSchedulableCard({
      state: card.state,
      intervalDays: card.intervalDays,
      ease: card.ease,
      reps: card.reps,
      lapses: card.lapses,
    });
    const next = scheduleCard(previous, rating, now);

    card.state = next.state;
    card.ease = next.ease;
    card.intervalDays = next.intervalDays;
    card.reps = next.reps;
    card.lapses = next.lapses;
    card.dueAt = next.dueAt;
    card.lastRating = rating;
    card.lastReviewedAt = now;
    await card.save();

    /*
     * The log is best-effort: it powers the "reviewed today" count and the
     * accuracy trend, neither of which is worth failing a review the student
     * has already completed.
     */
    try {
      await ReviewLog.create({
        userId: session.user.id,
        cardId: card._id,
        deck: card.deck,
        rating,
        reviewedAt: now,
        intervalDays: next.intervalDays,
        previousIntervalDays: previous.intervalDays,
        ease: next.ease,
      });
    } catch (logError) {
      console.error("Review log write failed:", logError);
    }

    const due = await Flashcard.countDocuments({
      userId: session.user.id,
      dueAt: { $lte: new Date() },
    });

    return NextResponse.json({ card, due, nextReviewAt: next.dueAt });
  } catch (error: unknown) {
    console.error("Flashcard review error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
