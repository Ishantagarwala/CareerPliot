import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Flashcard from "@/models/Flashcard";
import ReviewLog from "@/models/ReviewLog";
import { cardKey } from "@/lib/flashcards";

export const dynamic = "force-dynamic";

/** Edits a card. Scheduling fields are deliberately not editable here. */
export async function PATCH(
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
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ message: "Nothing to update." }, { status: 400 });
    }

    await dbConnect();
    const card = await Flashcard.findOne({ _id: id, userId: session.user.id });
    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    if (typeof body.front === "string") {
      const front = body.front.trim().slice(0, 300);
      if (!front) {
        return NextResponse.json({ message: "The front cannot be empty." }, { status: 400 });
      }
      card.front = front;
      card.fingerprint = cardKey(front);
    }
    if (typeof body.back === "string") {
      const back = body.back.trim().slice(0, 800);
      if (!back) {
        return NextResponse.json({ message: "The back cannot be empty." }, { status: 400 });
      }
      card.back = back;
    }
    if (typeof body.deck === "string" && body.deck.trim()) {
      card.deck = body.deck.trim().slice(0, 60);
    }

    try {
      await card.save();
    } catch (saveError) {
      if ((saveError as { code?: number }).code === 11000) {
        return NextResponse.json(
          { message: "Another card in this deck already asks the same thing." },
          { status: 409 }
        );
      }
      throw saveError;
    }

    return NextResponse.json(card);
  } catch (error: unknown) {
    console.error("Flashcard PATCH error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    await dbConnect();
    const result = await Flashcard.deleteOne({ _id: id, userId: session.user.id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    /*
     * The card's history goes with it. Leaving the rows behind would keep
     * counting the deleted card in "reviewed today" — a number the dashboard
     * shows — and would orphan logs pointing at a card that no longer exists.
     */
    await ReviewLog.deleteMany({ cardId: id, userId: session.user.id }).catch(
      (error: unknown) => console.error("Review log cleanup failed:", error)
    );

    return NextResponse.json({ message: "Card deleted" });
  } catch (error: unknown) {
    console.error("Flashcard DELETE error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
