import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IFocusSession extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  minutes: number;
  mode: "focus" | "shortBreak" | "longBreak";
  completedAt: Date;
}

const FocusSessionSchema = new Schema<IFocusSession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  minutes: { type: Number, required: true, min: 0 },
  mode: {
    type: String,
    enum: ["focus", "shortBreak", "longBreak"],
    default: "focus",
  },
  completedAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.models.FocusSession ||
  mongoose.model<IFocusSession>("FocusSession", FocusSessionSchema);
