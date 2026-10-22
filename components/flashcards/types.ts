export type FlashcardState = "new" | "learning" | "review" | "relearning";

export interface Flashcard {
  _id: string;
  deck: string;
  front: string;
  back: string;
  state: FlashcardState;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string;
  sourcePage?: number;
  createdAt?: string;
}

export interface DeckSummary {
  deck: string;
  total: number;
  due: number;
  fresh: number;
}

export interface FlashcardStats {
  total: number;
  due: number;
  reviewedToday: number;
}

export interface FlashcardDocument {
  _id: string;
  filename: string;
  createdAt?: string;
  summary?: string;
}

export const RATING_LABELS = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
} as const;

/**
 * Per-rating button styling. "Again" is the destructive one; "Good" is the
 * default path a student should reach for, so it gets the brand accent.
 */
export const RATING_CLASSES = {
  again: "border-destructive/50 text-destructive hover:bg-destructive/10",
  hard: "border-border text-foreground hover:bg-muted",
  good: "border-black bg-primary text-primary-foreground hover:opacity-90",
  easy: "border-border text-foreground hover:bg-muted",
} as const;
