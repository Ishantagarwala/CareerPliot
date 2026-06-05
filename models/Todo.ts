import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ITodo extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  text: string;
  completed: boolean;
  createdAt: Date;
}

const TodoSchema = new Schema<ITodo>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);
