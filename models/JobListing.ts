import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IJobListing extends MongooseDocument {
  title: string;
  company: string;
  companyLogo?: string;
  type: 'internship' | 'full-time' | 'part-time' | 'contract';
  location: string;
  remote: boolean;
  salary: {
    min?: number;
    max?: number;
    currency: string;
  };
  description: string;
  requirements: string[];
  skills: string[];
  careerPaths: string[];
  applyUrl: string;
  postedDate: Date;
  deadline?: Date;
}

const JobListingSchema = new Schema<IJobListing>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  companyLogo: { type: String },
  type: { type: String, enum: ['internship', 'full-time', 'part-time', 'contract'], required: true },
  location: { type: String, required: true },
  remote: { type: Boolean, default: false },
  salary: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'INR' },
  },
  description: { type: String, required: true },
  requirements: [{ type: String }],
  skills: [{ type: String }],
  careerPaths: [{ type: String }],
  applyUrl: { type: String, required: true },
  postedDate: { type: Date, default: Date.now },
  deadline: { type: Date },
}, { timestamps: true });

export default mongoose.models.JobListing || mongoose.model<IJobListing>('JobListing', JobListingSchema);
