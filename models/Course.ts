import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ICourse extends MongooseDocument {
  title: string;
  platform: string;
  url: string;
  careerPath?: string;
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  isFree: boolean;
  rating?: number;
}

const CourseSchema = new Schema<ICourse>({
  title: { type: String, required: true },
  platform: { type: String, required: true },
  url: { type: String, required: true },
  careerPath: { type: String, index: true },
  skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  isFree: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5 },
});

export default mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
