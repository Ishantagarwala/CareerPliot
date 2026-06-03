import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IMilestone {
  _id?: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface IRoadmapStage {
  name: 'beginner' | 'intermediate' | 'advanced';
  milestones: IMilestone[];
}

export interface IRoadmap extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  careerPath: string;
  stages: IRoadmapStage[];
  currentStage: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapSchema = new Schema<IRoadmap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerPath: { type: String, required: true },
  stages: [{
    name: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    milestones: [{
      title: { type: String, required: true },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
    }],
  }],
  currentStage: { type: String, default: 'beginner', enum: ['beginner', 'intermediate', 'advanced'] },
}, { timestamps: true });

export default mongoose.models.Roadmap || mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);
