import mongoose, {
  Schema,
  Document as MongooseDocument,
  type Model,
} from 'mongoose';

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
  filename: { type: String, required: true, maxlength: 200 },
  fileUrl: { type: String, required: true, maxlength: 500 }, // Local path or cloud storage path
  contentText: { type: String, maxlength: 1_000_000 },
  summary: { type: String },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'short', 'flashcard'], required: true },
  }],
}, { timestamps: true });

const DocumentModel =
  (mongoose.models.Document as Model<IDocument> | undefined) ||
  mongoose.model<IDocument>('Document', DocumentSchema);

export default DocumentModel;
