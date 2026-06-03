import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ISkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

export interface IUserProfile extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  interests: string[];
  goals: string;
  subjects: string[];
  skills: ISkill[];
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
  assessedAt: { type: Date, default: Date.now },
});

export default mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
