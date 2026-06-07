import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IHackathon extends MongooseDocument {
  title: string;
  organizer: string;
  platform: 'devfolio' | 'mlh' | 'unstop' | 'hackerearth' | 'other';
  url: string;
  description: string;
  startDate: Date;
  endDate: Date;
  mode: 'online' | 'offline' | 'hybrid';
  location?: string;
  prizes: string;
  themes: string[];
  status: 'upcoming' | 'active' | 'completed';
}

const HackathonSchema = new Schema<IHackathon>({
  title: { type: String, required: true },
  organizer: { type: String, required: true },
  platform: { type: String, enum: ['devfolio', 'mlh', 'unstop', 'hackerearth', 'other'], default: 'other' },
  url: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
  location: { type: String },
  prizes: { type: String, required: true },
  themes: [{ type: String }],
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' }
}, { timestamps: true });

export default mongoose.models.Hackathon || mongoose.model<IHackathon>('Hackathon', HackathonSchema);
