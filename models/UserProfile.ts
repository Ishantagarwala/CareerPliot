import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ISkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface IActiveCourse {
  title: string;
  platform: string;
  progress: number;
  estCompletion: string;
}

export interface IFutureGoals {
  shortTerm: string[];
  longTerm: string[];
}

export interface IUserProfile extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  interests: string[];
  goals: string;
  subjects: string[];
  skills: ISkill[];
  currentCourse?: string;
  activeCurriculum?: IActiveCourse[];
  futureGoals?: IFutureGoals;
  assessedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  interests: [{ type: String }],
  goals: { type: String },
  subjects: [{ type: String }],
  skills: [{
    name: { type: String },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
  }],
  currentCourse: { type: String, default: "" },
  activeCurriculum: [{
    title: { type: String, required: true },
    platform: { type: String, required: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    estCompletion: { type: String, required: true }
  }],
  futureGoals: {
    shortTerm: [{ type: String }],
    longTerm: [{ type: String }]
  },
  assessedAt: { type: Date, default: Date.now },
});

export default mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);

