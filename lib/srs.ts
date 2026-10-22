/**
 * Spaced repetition scheduling.
 *
 * SM-2, the algorithm behind the original SuperMemo and Anki's default, with
 * three deliberate simplifications:
 *
 * 1. **Four ratings instead of six.** `again | hard | good | easy` is what the
 *    review UI can show without a keypress guide, and the two q-values SM-2
 *    collapses into "hard" behave almost identically in practice.
 * 2. **No interval fuzz.** SM-2 adds a random 0–5% so cards learned together do
 *    not pile up on the same day. That matters at Anki scale; here a deck is a
 *    few dozen cards from one PDF, and a deterministic scheduler can be tested
 *    exactly. Fuzz can be added later without changing the data model.
 * 3. **A fixed 10-minute relearn step.** "Again" returns the card in the same
 *    session rather than tomorrow, which is the behaviour people expect from a
 *    flashcard app and the reason a 20-card session is finishable.
 *
 * Everything is pure and takes `now`, so the tests assert real dates rather
 * than sleeping.
 */

export type CardState = "new" | "learning" | "review" | "relearning";

export const REVIEW_RATINGS = ["again", "hard", "good", "easy"] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

/** The scheduling fields a card must carry. Kept separate from the Mongoose model. */
export interface SchedulableCard {
  state: CardState;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

export interface ScheduledCard extends SchedulableCard {
  dueAt: Date;
}

export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const MAX_INTERVAL_DAYS = 365;
export const DEFAULT_EASE = 2.5;

/** How long a lapsed card waits before it is shown again in the same session. */
export const RELEARN_DELAY_MS = 10 * 60 * 1000;

/** SM-2's ease penalties and bonuses, per rating. */
const EASE_DELTA: Record<ReviewRating, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** Interval multipliers for answers on a card that is already in review. */
const INTERVAL_FACTOR: Record<Exclude<ReviewRating, "again">, number> = {
  hard: 1.2,
  good: 1,
  easy: 1.3,
};

/** First intervals for a card that has never been answered successfully. */
const FIRST_INTERVAL_DAYS: Record<Exclude<ReviewRating, "again">, number> = {
  hard: 1,
  good: 1,
  easy: 3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function isReviewRating(value: unknown): value is ReviewRating {
  return (
    typeof value === "string" && (REVIEW_RATINGS as readonly string[]).includes(value)
  );
}

/**
 * Repairs a card read from the database before scheduling.
 *
 * Cards written by an older version — or by a client that sent a partial body —
 * could carry `ease: 0` or a negative interval, which would collapse every
 * future interval to zero and make the card due forever.
 */
export function normalizeSchedulableCard(
  card: Partial<SchedulableCard> | null | undefined
): SchedulableCard {
  return {
    state: card?.state ?? "new",
    intervalDays: isPositiveNumber(card?.intervalDays) ? card.intervalDays : 0,
    ease: isPositiveNumber(card?.ease)
      ? clamp(card.ease, MIN_EASE, MAX_EASE)
      : DEFAULT_EASE,
    reps: Number.isFinite(card?.reps) && (card?.reps ?? 0) > 0 ? Math.floor(card!.reps!) : 0,
    lapses:
      Number.isFinite(card?.lapses) && (card?.lapses ?? 0) > 0
        ? Math.floor(card!.lapses!)
        : 0,
  };
}

/**
 * Applies a rating and returns the card's next scheduling state.
 *
 * A card counts as "new" when it has never been answered (`reps === 0`) or has
 * no interval yet, regardless of the stored state — that is what makes a card
 * that was reset by "Again" behave like a new one on its next successful answer
 * instead of multiplying a stale interval.
 */
export function scheduleCard(
  card: SchedulableCard,
  rating: ReviewRating,
  now: Date = new Date()
): ScheduledCard {
  const current = normalizeSchedulableCard(card);
  const ease = clamp(current.ease + EASE_DELTA[rating], MIN_EASE, MAX_EASE);

  if (rating === "again") {
    /*
     * SM-2 resets the repetition count and leaves the interval at zero. The
     * card is relearning, not due tomorrow: it comes back later in the same
     * session, which is the only way "Again" is useful while reviewing.
     */
    return {
      state: "relearning",
      intervalDays: 0,
      ease,
      reps: 0,
      lapses: current.lapses + 1,
      dueAt: new Date(now.getTime() + RELEARN_DELAY_MS),
    };
  }

  const isFirstSuccess = current.reps === 0 || current.intervalDays <= 0;
  const nextInterval = isFirstSuccess
    ? FIRST_INTERVAL_DAYS[rating]
    : clamp(
        Math.round(current.intervalDays * ease * INTERVAL_FACTOR[rating]),
        1,
        MAX_INTERVAL_DAYS
      );

  return {
    state: "review",
    intervalDays: nextInterval,
    ease,
    reps: current.reps + 1,
    lapses: current.lapses,
    dueAt: new Date(now.getTime() + nextInterval * DAY_MS),
  };
}

/** True when a card is due for review at `now`. */
export function isDue(
  card: { dueAt?: Date | string | null },
  now: Date = new Date()
): boolean {
  if (!card.dueAt) return true;
  const due = card.dueAt instanceof Date ? card.dueAt : new Date(card.dueAt);
  if (Number.isNaN(due.getTime())) return true;
  return due.getTime() <= now.getTime();
}

/**
 * Human-readable delay, used on the rating buttons ("10m", "3d", "2mo").
 * Deliberately coarse: a card due in 26 hours is "1d", not "1.1d".
 */
export function formatDelay(ms: number): string {
  if (ms <= 0) return "now";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.round(days / 365)}y`;
}

/**
 * What each button would do to this card, so the UI can print the real
 * interval rather than a hard-coded guess that drifts from the scheduler.
 */
export function previewRatings(
  card: SchedulableCard,
  now: Date = new Date()
): Record<ReviewRating, string> {
  const preview = {} as Record<ReviewRating, string>;
  for (const rating of REVIEW_RATINGS) {
    const next = scheduleCard(card, rating, now);
    preview[rating] = formatDelay(next.dueAt.getTime() - now.getTime());
  }
  return preview;
}
