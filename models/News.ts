import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface INews extends MongooseDocument {
  title: string;
  summary: string;
  content: string;
  publishedAt: Date;
  readTime: string;
  tags: string[];
  category: 'Featured' | 'Live Feed' | 'In-Depth Analysis';
  imageUrl?: string;
  imageAlt?: string;
  sourceUrl?: string;
  source?: string;
  fetchedAt?: Date;
}

const NewsSchema = new Schema<INews>({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now },
  readTime: { type: String, required: true }, // e.g. "5 Min Read"
  tags: [{ type: String, index: true }], // e.g. ["India", "Leadership", "SaaS"]
  category: { type: String, enum: ['Featured', 'Live Feed', 'In-Depth Analysis'], required: true },
  imageUrl: { type: String },
  imageAlt: { type: String },
  sourceUrl: { type: String },
  source: { type: String },
  fetchedAt: { type: Date, default: Date.now, index: true }
});

// Index on title for deduplication
NewsSchema.index({ title: 1 }, { unique: true });

export default mongoose.models.News || mongoose.model<INews>('News', NewsSchema);
