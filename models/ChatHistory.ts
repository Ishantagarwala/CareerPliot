import mongoose, {
  Schema,
  Document as MongooseDocument,
  type Model,
} from 'mongoose';

export interface IAttachment {
  type: 'pdf' | 'image';
  filename: string;
  fileUrl: string;
  docId?: mongoose.Types.ObjectId;
}

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Chain-of-thought text from reasoning models; absent on plain models. */
  reasoning?: string;
  documentIds?: mongoose.Types.ObjectId[];
  attachments?: IAttachment[];
  sentAt: Date;
}

export interface IChatHistory extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  threadTitle?: string;
  /** 'manual' once the user renames it — auto-titling then stops. */
  titleSource?: 'auto' | 'manual';
  threadType?: 'general' | 'document' | 'tutor';
  documentIds: mongoose.Types.ObjectId[];
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatHistorySchema = new Schema<IChatHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  threadTitle: { type: String, default: 'AI Study Hub', maxlength: 80 },
  titleSource: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  threadType: { type: String, enum: ['general', 'document', 'tutor'], default: 'general' },
  documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    reasoning: { type: String, maxlength: 20000 },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    attachments: [{
      type: { type: String, enum: ['pdf', 'image'] },
      filename: { type: String, maxlength: 200 },
      fileUrl: { type: String, maxlength: 500 },
      docId: { type: Schema.Types.ObjectId, ref: 'Document' }
    }],
    sentAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const ChatHistory =
  (mongoose.models.ChatHistory as Model<IChatHistory> | undefined) ||
  mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);

export default ChatHistory;
