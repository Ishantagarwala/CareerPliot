import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IApplication extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId; // Optional in case of custom jobs manually added
  externalJobKey?: string; // Stable key for live board jobs (remotive-123, jsearch-…)
  customJob?: {
    title: string;
    company: string;
    url?: string;
  };
  status: 'saved' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
  appliedDate?: Date;
  notes?: string;
}

const ApplicationSchema = new Schema<IApplication>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'JobListing' },
  externalJobKey: { type: String, index: true },
  customJob: {
    title: { type: String },
    company: { type: String },
    url: { type: String }
  },
  status: {
    type: String,
    enum: ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'],
    default: 'saved'
  },
  appliedDate: { type: Date, default: Date.now },
  notes: { type: String, default: "" }
}, { timestamps: true });

ApplicationSchema.index({ userId: 1, externalJobKey: 1 }, { unique: true, sparse: true });

export default mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
