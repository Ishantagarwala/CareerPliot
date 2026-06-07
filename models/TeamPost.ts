import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ITeamPost extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  hackathonId?: mongoose.Types.ObjectId; // Optional link to a specific hackathon
  title: string;
  description: string;
  lookingFor: string[];
  teamSize: number;
  currentMembers: number;
  status: 'open' | 'closed';
  contactMethod: string;
}

const TeamPostSchema = new Schema<ITeamPost>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hackathonId: { type: Schema.Types.ObjectId, ref: 'Hackathon' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  lookingFor: [{ type: String }],
  teamSize: { type: Number, required: true, min: 2 },
  currentMembers: { type: Number, default: 1, min: 1 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  contactMethod: { type: String, required: true }
}, { timestamps: true });

export default mongoose.models.TeamPost || mongoose.model<ITeamPost>('TeamPost', TeamPostSchema);
