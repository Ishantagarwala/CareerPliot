import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Document from "@/models/Document";
import Flashcard from "@/models/Flashcard";
import { generateStructuredJson } from "@/lib/llm";
import { enforceLlmBudget } from "@/lib/llmGuard";
import { splitIntoPassages, selectPassages } from "@/lib/documentContext";
import {
  MAX_CARDS_PER_DECK,
  buildFlashcardPrompts,
  cardKey,
  clampCardCount,
  deckNameForDocument,
  normalizeGeneratedCards,
} from "@/lib/flashcards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONTEXT_BUDGET = 24_000;

/**
 * Samples passages across the whole document rather than its opening pages.
 *
 * `selectPassages` with an empty question falls back to an even sample, which
 * is exactly what card generation wants: a deck that covers the material
 * instead of 4,000 words of the introduction.
 */
function buildCoverage(text: string): string {
  if (text.length <= CONTEXT_BUDGET) return text;

  const { passages } = splitIntoPassages(text);
  if (!passages.length) return text.slice(0, CONTEXT_BUDGET);

  const limit = Math.max(4, Math.floor(CONTEXT_BUDGET / 1200));
  const { selected } = selectPassages(passages, "", limit);

  const excerpts: string[] = [];
  let used = 0;
  for (const passage of selected) {
    if (used + passage.text.length > CONTEXT_BUDGET && excerpts.length > 0) break;
    const page = passage.startPage ? `, page ${passage.startPage}` : "";
    excerpts.push(`[part ${passage.index} of ${passages.length}${page}]\n${passage.text}`);
    used += passage.text.length;
  }

  return excerpts.join("\n\n");
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const documentId = typeof body?.documentId === "string" ? body.documentId : "";
    if (!mongoose.isValidObjectId(documentId)) {
      return NextResponse.json({ message: "Choose a document first." }, { status: 400 });
    }

    const count = clampCardCount(body?.count);

    await dbConnect();
    const document = await Document.findOne({ _id: documentId, userId });
    if (!document) {
      return NextResponse.json({ message: "Document not found" }, { status: 404 });
    }

    const content = (document.contentText || "").trim();
    if (!content) {
      return NextResponse.json(
        {
          message:
            "This document has no extracted text, so there is nothing to make cards from. Scanned PDFs need OCR first.",
        },
        { status: 422 }
      );
    }
    if (content.length < 200) {
      return NextResponse.json(
        { message: "That document is too short to make useful cards from." },
        { status: 422 }
      );
    }

    const deck = deckNameForDocument(document.filename);
    const existing = await Flashcard.countDocuments({ userId, deck });
    const remaining = MAX_CARDS_PER_DECK - existing;
    if (remaining <= 0) {
      return NextResponse.json(
        { message: `"${deck}" has reached its ${MAX_CARDS_PER_DECK}-card limit.` },
        { status: 409 }
      );
    }

    const limited = enforceLlmBudget(userId, "flashcards", 8);
    if (limited) return limited;

    const prompts = buildFlashcardPrompts({
      deck,
      context: buildCoverage(content),
      count: Math.min(count, remaining),
    });

    let raw: unknown;
    try {
      raw = await generateStructuredJson<unknown>(prompts.system, prompts.user);
    } catch (llmError) {
      console.error("Flashcard generation LLM error:", llmError);
      return NextResponse.json(
        { message: "Card generation failed. Try again in a moment." },
        { status: 502 }
      );
    }

    /*
     * `count` is a ceiling, not a target: a model that returns six good cards
     * when twelve were asked for is reporting the material's real depth.
     * Padding to hit the number would produce filler.
     */
    const generated = normalizeGeneratedCards(raw, Math.min(count, remaining));
    if (generated.length === 0) {
      return NextResponse.json(
        { message: "The model did not return usable cards for this document. Try a shorter range or another file." },
        { status: 502 }
      );
    }

    // Skip cards already in the deck, then insert one at a time so a duplicate
    // that slips past the pre-check cannot abort the whole batch.
    const existingCards = await Flashcard.find({ userId, deck })
      .select("fingerprint")
      .lean();
    const known = new Set(existingCards.map((card) => card.fingerprint));

    const created = [];
    let skipped = 0;
    for (const card of generated) {
      const fingerprint = cardKey(card.front);
      if (known.has(fingerprint)) {
        skipped += 1;
        continue;
      }
      try {
        const saved = await Flashcard.create({
          userId,
          deck,
          front: card.front,
          back: card.back,
          fingerprint,
          documentId: document._id,
          sourcePage: card.page,
        });
        known.add(fingerprint);
        created.push(saved);
      } catch (createError) {
        if ((createError as { code?: number }).code === 11000) {
          skipped += 1;
          continue;
        }
        throw createError;
      }
    }

    return NextResponse.json({
      deck,
      requested: count,
      created: created.length,
      skipped,
      cards: created,
    });
  } catch (error: unknown) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
