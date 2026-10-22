import mongoose, {
  Schema,
  Document as MongooseDocument,
  type Model,
} from "mongoose";

export type FlashcardState = "new" | "learning" | "review" | "relearning";

export interface IFlashcard extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  /** Deck the card belongs to: a document name, or a topic the user chose. */
  deck: string;
  front: string;
  back: string;
  /**
   * Normalised front text (see `cardKey` in lib/flashcards.ts). Unique per
   * user+deck so regenerating a document cannot add the same card twice.
   */
  fingerprint: string;
  /** Set when the card was generated from an uploaded document. */
  documentId?: mongoose.Types.ObjectId;
  sourcePage?: number;

  // ── Scheduling (written only by lib/srs.ts) ──
  state: FlashcardState;
  /** Ease factor; 2.5 is SM-2's starting value. */
  ease: number;
  /** Current interval in days; 0 while the card is still being learned. */
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: Date;

  lastRating?: "again" | "hard" | "good" | "easy";
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deck: { type: String, required: true, maxlength: 60, trim: true },
    front: { type: String, required: true, maxlength: 300, trim: true },
    back: { type: String, required: true, maxlength: 800, trim: true },
    fingerprint: { type: String, required: true, maxlength: 200 },
    documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    sourcePage: { type: Number, min: 1 },

    state: {
      type: String,
      enum: ["new", "learning", "review", "relearning"],
      default: "new",
    },
    ease: { type: Number, default: 2.5, min: 1.3, max: 3.0 },
    intervalDays: { type: Number, default: 0, min: 0 },
    reps: { type: Number, default: 0, min: 0 },
    lapses: { type: Number, default: 0, min: 0 },
    // New cards are due immediately, which is what puts them in the first
    // review session instead of hiding until tomorrow.
    dueAt: { type: Date, default: Date.now },

    lastRating: {
      type: String,
      enum: ["again", "hard", "good", "easy"],
    },
    lastReviewedAt: { type: Date },
  },
  { timestamps: true }
);

// The review queue: "this user's cards that are due, oldest first".
FlashcardSchema.index({ userId: 1, dueAt: 1 });
// Deck listing and per-deck counts.
FlashcardSchema.index({ userId: 1, deck: 1 });
// Regeneration de-duplication. Sparse is not needed: every card has one.
FlashcardSchema.index({ userId: 1, deck: 1, fingerprint: 1 }, { unique: true });

const FlashcardModel =
  (mongoose.models.Flashcard as Model<IFlashcard> | undefined) ||
  mongoose.model<IFlashcard>("Flashcard", FlashcardSchema);

export default FlashcardModel;
