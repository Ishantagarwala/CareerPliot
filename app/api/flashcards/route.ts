import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Flashcard from "@/models/Flashcard";
import ReviewLog from "@/models/ReviewLog";
import { cardKey } from "@/lib/flashcards";
import { rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/**
 * Without `?deck=`, returns the deck list plus today's counters.
 * With `?deck=Name`, returns that deck's cards (`&due=1` for the review queue).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    await dbConnect();

    const url = new URL(req.url);
    const deck = url.searchParams.get("deck")?.trim();
    const dueOnly = url.searchParams.get("due") === "1";
    const requestedLimit = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(200, Math.max(1, Math.round(requestedLimit)))
      : 100;

    if (deck) {
      const query: Record<string, unknown> = { userId, deck };
      if (dueOnly) query.dueAt = { $lte: new Date() };

      const cards = await Flashcard.find(query)
        .sort(dueOnly ? { dueAt: 1 } : { createdAt: -1 })
        .limit(limit)
        .lean();

      return NextResponse.json({ deck, cards });
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [rows, reviewedToday, dueCards] = await Promise.all([
      Flashcard.aggregate<{ _id: string; total: number; due: number; fresh: number }>([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: "$deck",
            total: { $sum: 1 },
            due: { $sum: { $cond: [{ $lte: ["$dueAt", now] }, 1, 0] } },
            fresh: { $sum: { $cond: [{ $eq: ["$state", "new"] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ReviewLog.countDocuments({ userId, reviewedAt: { $gte: startOfToday } }),
      /*
       * "Review everything due" needs the cards across every deck. One query
       * here is cheaper than the client looping over decks and merging them.
       */
      dueOnly
        ? Flashcard.find({ userId, dueAt: { $lte: now } })
            .sort({ dueAt: 1 })
            .limit(limit)
            .lean()
        : Promise.resolve([]),
    ]);

    const decks = rows.map((row) => ({
      deck: row._id,
      total: row.total,
      due: row.due,
      fresh: row.fresh,
    }));

    return NextResponse.json({
      decks,
      stats: {
        total: decks.reduce((sum, deckRow) => sum + deckRow.total, 0),
        due: decks.reduce((sum, deckRow) => sum + deckRow.due, 0),
        reviewedToday,
      },
      ...(dueOnly ? { cards: dueCards } : {}),
    });
  } catch (error: unknown) {
    console.error("Flashcards GET error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/** Adds a card by hand. Uses the same fingerprint rule as generation. */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    if (!rateLimit(`flashcards:create:${userId}`, 120, HOUR)) {
      return NextResponse.json(
        { message: "Too many cards created this hour. Try again later." },
        { status: 429 }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const front = typeof body?.front === "string" ? body.front.trim().slice(0, 300) : "";
    const back = typeof body?.back === "string" ? body.back.trim().slice(0, 800) : "";
    const deck =
      (typeof body?.deck === "string" ? body.deck.trim().slice(0, 60) : "") || "My deck";

    if (!front || !back) {
      return NextResponse.json(
        { message: "A card needs both a front and a back." },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingInDeck = await Flashcard.countDocuments({ userId, deck });
    if (existingInDeck >= 300) {
      return NextResponse.json(
        { message: `"${deck}" has reached its 300-card limit.` },
        { status: 409 }
      );
    }

    try {
      const card = await Flashcard.create({
        userId,
        deck,
        front,
        back,
        fingerprint: cardKey(front),
      });
      return NextResponse.json(card, { status: 201 });
    } catch (createError) {
      if ((createError as { code?: number }).code === 11000) {
        return NextResponse.json(
          { message: "That card is already in this deck." },
          { status: 409 }
        );
      }
      throw createError;
    }
  } catch (error: unknown) {
    console.error("Flashcards POST error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
