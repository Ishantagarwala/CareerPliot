import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  sentAt: Date;
}

export interface IChatHistory extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatHistorySchema = new Schema<IChatHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

export default mongoose.models.ChatHistory || mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
