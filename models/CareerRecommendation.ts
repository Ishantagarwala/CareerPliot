import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ICareerRecommendation extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  careerPath: string;
  matchScore: number;
  reasoning: string;
  selected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CareerRecommendationSchema = new Schema<ICareerRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerPath: { type: String, required: true },
  matchScore: { type: Number }, // AI compatibility percentage score (0-100)
  reasoning: { type: String }, // AI reasoning string
  selected: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.CareerRecommendation || mongoose.model<ICareerRecommendation>('CareerRecommendation', CareerRecommendationSchema);
