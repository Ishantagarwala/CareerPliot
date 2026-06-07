import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IQuestion {
  question: string;
  options?: string[];
  answer: string;
  type: 'mcq' | 'short' | 'flashcard';
}

export interface IDocument extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  filename: string;
  fileUrl: string;
  contentText?: string;
  summary?: string;
  questions: IQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Local path or cloud storage path
  contentText: { type: String },
  summary: { type: String },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'short', 'flashcard'], required: true },
  }],
}, { timestamps: true });

export default mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema);
