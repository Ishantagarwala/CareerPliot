import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  documentIds?: mongoose.Types.ObjectId[];
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
  threadTitle: { type: String, default: 'AI Study Hub' },
  threadType: { type: String, enum: ['general', 'document'], default: 'general' },
  documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    documentIds: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    sentAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export default mongoose.models.ChatHistory || mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
