"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import PageLoader from "@/components/layout/PageLoader";
import EmptyState from "@/components/ui/EmptyState";
import ReviewSession from "@/components/flashcards/ReviewSession";
import type {
  DeckSummary,
  Flashcard,
  FlashcardDocument,
  FlashcardStats,
} from "@/components/flashcards/types";

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

const CARD_COUNTS = [6, 8, 12, 16, 20, 24];

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
        {label}
      </p>
      <p className="text-3xl font-bold text-foreground tabular-nums mt-1">{value}</p>
    </div>
  );
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [stats, setStats] = useState<FlashcardStats>({ total: 0, due: 0, reviewedToday: 0 });
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"decks" | "review">("decks");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const [documents, setDocuments] = useState<FlashcardDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [cardCount, setCardCount] = useState(12);
  const [generating, setGenerating] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newDeck, setNewDeck] = useState("");
  const [adding, setAdding] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/flashcards");
      if (!res.ok) throw new Error("Failed to load your decks");
      const data = await res.json();
      setDecks(Array.isArray(data.decks) ? data.decks : []);
      setStats(data.stats ?? { total: 0, due: 0, reviewedToday: 0 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your decks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ai-hub/documents");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setDocuments(data);
        if (data.length > 0) setSelectedDoc(data[0]._id);
      } catch {
        /* the picker just stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const beginReview = async (deck: string | null) => {
    setLoadingCards(true);
    try {
      const url = deck
        ? `/api/flashcards?deck=${encodeURIComponent(deck)}&due=1&limit=100`
        : "/api/flashcards?due=1&limit=100";
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not load cards.");

      const cards: Flashcard[] = Array.isArray(data.cards) ? data.cards : [];
      if (cards.length === 0) {
        toast.info(
          deck
            ? "Nothing due in this deck. Come back tomorrow — spacing is the point."
            : "Nothing is due right now. Every card is scheduled for later."
        );
        return;
      }

      setReviewCards(cards);
      setReviewTitle(deck ?? "Everything due");
      setView("review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load cards.");
    } finally {
      setLoadingCards(false);
    }
  };

  const generate = async () => {
    if (!selectedDoc) {
      toast.error("Choose a document to make cards from.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: selectedDoc, count: cardCount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not generate cards.");

      if (data.created === 0) {
        toast.info("Those cards are already in your deck — nothing new to add.");
      } else {
        toast.success(
          `${data.created} card${data.created === 1 ? "" : "s"} added to “${data.deck}”${
            data.skipped ? ` · ${data.skipped} already existed` : ""
          }.`
        );
      }
      await loadSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate cards.");
    } finally {
      setGenerating(false);
    }
  };

  const addCard = async () => {
    if (!newFront.trim() || !newBack.trim()) {
      toast.error("A card needs both a front and a back.");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck: newDeck.trim() || "My deck",
          front: newFront,
          back: newBack,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not add that card.");

      toast.success("Card added");
      setNewFront("");
      setNewBack("");
      await loadSummary();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that card.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading flashcards" />;
  }

  if (view === "review") {
    return (
      <ReviewSession
        deck={reviewTitle}
        cards={reviewCards}
        onFinished={(reviewed) => {
          toast.success(
            reviewed > 0
              ? `Session done — ${reviewed} card${reviewed === 1 ? "" : "s"} reviewed.`
              : "Session ended."
          );
          setView("decks");
          setReviewCards([]);
          void loadSummary();
        }}
        onExit={() => {
          setView("decks");
          setReviewCards([]);
          void loadSummary();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3"
            style={{ fontFamily: "'Hanken Grotesk', system-ui, sans-serif" }}
          >
            <span className="material-symbols-outlined text-[28px]">layers</span>
            Flashcards
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Cards from your own uploads, scheduled so the ones you find hard come back sooner and
            the ones you know drift further out.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void beginReview(null)}
          disabled={loadingCards || stats.due === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#000]"
          style={labelStyle}
        >
          {loadingCards ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
          Review due ({stats.due})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Due today" value={stats.due} />
        <StatTile label="Cards" value={stats.total} />
        <StatTile label="Reviewed today" value={stats.reviewedToday} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase text-muted-foreground" style={labelStyle}>
              Your decks
            </h2>
            <span className="text-[10px] text-muted-foreground" style={labelStyle}>
              {decks.length} {decks.length === 1 ? "deck" : "decks"}
            </span>
          </div>

          {decks.length === 0 ? (
            <EmptyState
              icon="style"
              title="No cards yet"
              description="Pick a PDF from your AI Hub library and turn it into a deck — or write your first card by hand."
              primaryLabel="Add a card"
              onPrimaryClick={() => setShowAdd(true)}
              secondaryHref="/ai-hub"
              secondaryLabel="Upload a document"
            />
          ) : (
            <div className="space-y-2">
              {decks.map((deck) => {
                const reviewedRatio = deck.total > 0 ? (deck.total - deck.due) / deck.total : 0;
                return (
                  <div
                    key={deck.deck}
                    className="bg-card border border-border p-4 flex flex-wrap items-center gap-4 justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm font-bold text-foreground truncate">{deck.deck}</p>
                        {deck.due > 0 && (
                          <span
                            className="shrink-0 text-[9px] font-bold uppercase bg-primary text-primary-foreground border border-black px-1.5 py-0.5"
                            style={labelStyle}
                          >
                            {deck.due} due
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1" style={labelStyle}>
                        {deck.total} cards · {deck.fresh} new
                      </p>
                      <div className="h-1 w-full bg-muted mt-2 overflow-hidden">
                        <div
                          className="h-full bg-primary/60"
                          style={{ width: `${Math.round(reviewedRatio * 100)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void beginReview(deck.deck)}
                      disabled={loadingCards}
                      className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 border border-border text-[10px] uppercase font-bold text-foreground hover:border-foreground transition-colors disabled:opacity-40"
                      style={labelStyle}
                    >
                      {deck.due > 0 ? "Review" : "Nothing due"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAdd((value) => !value)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            style={labelStyle}
          >
            <Plus className="h-3.5 w-3.5" />
            {showAdd ? "Hide manual entry" : "Add a card by hand"}
          </button>

          {showAdd && (
            <div className="border border-border bg-card p-5 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="new-front" className="block text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                    Front (question)
                  </label>
                  <textarea
                    id="new-front"
                    value={newFront}
                    onChange={(event) => setNewFront(event.target.value)}
                    rows={3}
                    maxLength={300}
                    className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-foreground"
                    placeholder="What does SQL's HAVING clause filter?"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="new-back" className="block text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                    Back (answer)
                  </label>
                  <textarea
                    id="new-back"
                    value={newBack}
                    onChange={(event) => setNewBack(event.target.value)}
                    rows={3}
                    maxLength={800}
                    className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-foreground"
                    placeholder="Groups of rows, after aggregation — WHERE filters rows first."
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1 flex-1 min-w-[180px]">
                  <label htmlFor="new-deck" className="block text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                    Deck
                  </label>
                  <input
                    id="new-deck"
                    value={newDeck}
                    onChange={(event) => setNewDeck(event.target.value)}
                    maxLength={60}
                    placeholder="My deck"
                    className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void addCard()}
                  disabled={adding}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground border-2 border-black text-[10px] uppercase font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40"
                  style={labelStyle}
                >
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add card
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="bg-card border border-border p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <h2 className="text-[11px] font-bold uppercase text-muted-foreground" style={labelStyle}>
              From your documents
            </h2>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              No documents yet. Upload a PDF in the{" "}
              <a href="/ai-hub" className="underline underline-offset-2 hover:text-foreground">
                AI Hub
              </a>{" "}
              and it will appear here.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <label htmlFor="flashcard-document" className="block text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                  Document
                </label>
                <select
                  id="flashcard-document"
                  value={selectedDoc}
                  onChange={(event) => setSelectedDoc(event.target.value)}
                  className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                >
                  {documents.map((document) => (
                    <option key={document._id} value={document._id}>
                      {document.filename}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="flashcard-count" className="block text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
                  How many cards
                </label>
                <select
                  id="flashcard-count"
                  value={cardCount}
                  onChange={(event) => setCardCount(Number(event.target.value))}
                  className="w-full bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground"
                >
                  {CARD_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count} cards
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => void generate()}
                disabled={generating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground border-2 border-black text-[10px] uppercase font-bold shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#000]"
                style={labelStyle}
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {generating ? "Reading the document…" : "Generate cards"}
              </button>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Cards are pulled from the whole document, not just the first pages. Regenerating
                only adds what is missing.
              </p>
            </>
          )}
        </aside>
      </div>

      <p className="text-[10px] text-muted-foreground uppercase font-bold pt-2 flex items-center gap-1.5" style={labelStyle}>
        <Trash2 className="h-3 w-3" />
        Delete a card from inside a review session
      </p>
    </div>
  );
}
