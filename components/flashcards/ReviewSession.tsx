"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { previewRatings, type ReviewRating } from "@/lib/srs";
import {
  RATING_CLASSES,
  RATING_LABELS,
  type Flashcard,
} from "./types";

interface ReviewSessionProps {
  deck: string;
  cards: Flashcard[];
  onFinished: (reviewed: number) => void;
  onExit: () => void;
}

const labelStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.06em",
} as const;

const RATING_ORDER: ReviewRating[] = ["again", "hard", "good", "easy"];

export default function ReviewSession({ deck, cards, onFinished, onExit }: ReviewSessionProps) {
  const [queue, setQueue] = useState<Flashcard[]>(cards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const requeuedRef = useRef<Set<string>>(new Set());
  const finishedRef = useRef(false);
  const card = queue[index];

  /*
   * "Again" puts the card back at the end of THIS session instead of trusting
   * the 10-minute relearn interval — a 20-card session is over long before ten
   * minutes pass, so without this the card the student just failed is never
   * seen again today. Each card may be requeued only once, or a card they
   * cannot answer would loop forever.
   */
  const requeue = useCallback((target: Flashcard) => {
    if (requeuedRef.current.has(target._id)) return;
    requeuedRef.current.add(target._id);
    setQueue((previous) => [...previous, target]);
  }, []);

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (!card || submitting) return;
      setSubmitting(true);
      try {
        const res = await fetch("/api/flashcards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card._id, rating }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Could not save that review.");

        if (rating === "again") requeue(card);
        setReviewed((value) => value + 1);
        setIndex((value) => value + 1);
        setRevealed(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save that review.");
      } finally {
        setSubmitting(false);
      }
    },
    [card, submitting, requeue]
  );

  useEffect(() => {
    if (finishedRef.current) return;
    if (index < queue.length) return;
    finishedRef.current = true;
    onFinished(reviewed);
  }, [index, queue.length, reviewed, onFinished]);

  const previews = useMemo(
    () => (card ? previewRatings(card, new Date()) : null),
    [card]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (event.key === " " || event.key === "Enter") {
        if (!revealed) {
          event.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (!revealed) return;
      const shortcut: Record<string, ReviewRating> = {
        "1": "again",
        "2": "hard",
        "3": "good",
        "4": "easy",
      };
      const rating = shortcut[event.key];
      if (rating) {
        event.preventDefault();
        void rate(rating);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, rate]);

  const removeCard = async () => {
    if (!card || submitting) return;
    if (!window.confirm("Delete this card permanently?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/flashcards/${card._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete that card.");
      setQueue((previous) => previous.filter((item) => item._id !== card._id));
      setRevealed(false);
      toast.success("Card deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete that card.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!card) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to decks"
            className="inline-flex items-center justify-center h-8 w-8 border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{deck}</p>
            <p className="text-[10px] text-muted-foreground uppercase" style={labelStyle}>
              Card {Math.min(index + 1, queue.length)} of {queue.length} · {reviewed} reviewed
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void removeCard()}
          aria-label="Delete this card"
          className="inline-flex items-center justify-center h-8 w-8 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-1.5 w-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        aria-label={revealed ? "Hide answer" : "Show answer"}
        className="w-full min-h-[260px] bg-card border-2 border-border hover:border-foreground/40 transition-colors p-8 flex flex-col items-center justify-center gap-6 text-center"
      >
        <span className="text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
          Question
        </span>
        <span className="text-lg sm:text-xl text-foreground leading-relaxed whitespace-pre-line max-w-2xl">
          {card.front}
        </span>

        {revealed ? (
          <>
            <span className="h-px w-16 bg-border" />
            <span className="text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
              Answer
            </span>
            <span className="text-base text-foreground leading-relaxed whitespace-pre-line max-w-2xl">
              {card.back}
            </span>
            {card.sourcePage ? (
              <span className="text-[10px] text-muted-foreground uppercase" style={labelStyle}>
                From page {card.sourcePage}
              </span>
            ) : null}
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold text-muted-foreground" style={labelStyle}>
            <Eye className="h-3.5 w-3.5" />
            Tap or press Space to reveal
          </span>
        )}
      </button>

      {revealed ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RATING_ORDER.map((rating, ratingIndex) => (
            <button
              key={rating}
              type="button"
              onClick={() => void rate(rating)}
              disabled={submitting}
              className={`flex flex-col items-center gap-1 px-3 py-3 border-2 text-xs font-bold uppercase transition-colors disabled:opacity-50 ${RATING_CLASSES[rating]}`}
              style={labelStyle}
            >
              <span className="flex items-center gap-1.5">
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 opacity-60" />}
                {RATING_LABELS[rating]}
              </span>
              <span className="text-[10px] font-normal normal-case opacity-70">
                {previews ? previews[rating] : "—"}
                <span className="hidden sm:inline"> · {ratingIndex + 1}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full px-4 py-3 bg-primary text-primary-foreground border-2 border-black text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          style={labelStyle}
        >
          Show answer
        </button>
      )}
    </div>
  );
}
