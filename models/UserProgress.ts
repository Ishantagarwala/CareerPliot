import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IUserProgress extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  coursesCompleted: number;
  pdfsAnalyzed: number;
  tutorSessions: number;
  streakDays: number;
  lastActive: Date;
}

const UserProgressSchema = new Schema<IUserProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  coursesCompleted: { type: Number, default: 0 },
  pdfsAnalyzed: { type: Number, default: 0 },
  tutorSessions: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
});

export default mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
