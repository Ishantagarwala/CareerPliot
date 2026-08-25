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
  documentIds?: mongoose.Types.ObjectId[];
  attachments?: IAttachment[];
  sentAt: Date;
}

export interface IChatHistory extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  threadTitle?: string;
  threadType?: 'general' | 'document';
  documentIds: mongoose.Types.ObjectId[];
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatHistorySchema = new Schema<IChatHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  threadTitle: { type: String, default: 'AI Study Hub', maxlength: 80 },
  threadType: { type: String, enum: ['general', 'document'], default: 'general' },
  documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
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
