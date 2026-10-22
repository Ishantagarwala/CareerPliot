import mongoose, {
  Schema,
  Document as MongooseDocument,
  type Model,
} from "mongoose";

/**
 * One row per review. Kept separate from the card so the card document stays
 * small (it is rewritten on every answer) and so "reviewed today" and the
 * accuracy trend can be answered with an index rather than by reading cards.
 */
export interface IReviewLog extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  cardId: mongoose.Types.ObjectId;
  deck: string;
  rating: "again" | "hard" | "good" | "easy";
  reviewedAt: Date;
  intervalDays: number;
  previousIntervalDays: number;
  ease: number;
}

const ReviewLogSchema = new Schema<IReviewLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cardId: {
      type: Schema.Types.ObjectId,
      ref: "Flashcard",
      required: true,
      index: true,
    },
    deck: { type: String, maxlength: 60 },
    rating: {
      type: String,
      enum: ["again", "hard", "good", "easy"],
      required: true,
    },
    reviewedAt: { type: Date, default: Date.now },
    intervalDays: { type: Number, default: 0 },
    previousIntervalDays: { type: Number, default: 0 },
    ease: { type: Number, default: 2.5 },
  },
  { timestamps: true }
);

ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });

const ReviewLogModel =
  (mongoose.models.ReviewLog as Model<IReviewLog> | undefined) ||
  mongoose.model<IReviewLog>("ReviewLog", ReviewLogSchema);

export default ReviewLogModel;
