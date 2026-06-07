import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IResume extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  title: string;
  template: string;
  isActive: boolean;
  content: {
    personalInfo: {
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      github?: string;
      portfolio?: string;
      summary?: string;
    };
    education: Array<Record<string, any>>;
    experience: Array<Record<string, any>>;
    projects: Array<Record<string, any>>;
    skills: {
      technical: string[];
      frameworks: string[];
      tools: string[];
      soft: string[];
    };
    certifications: Array<Record<string, any>>;
    customSections: Array<Record<string, any>>;
  };
  atsAnalysis?: {
    score: number;
    keywordDensity: number;
    formatting: number;
    readability: number;
    impact: number;
    suggestions: string[];
    strengths: string[];
    analyzedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, default: "My Resume" },
  template: { type: String, default: "modern" },
  isActive: { type: Boolean, default: true },
  content: {
    personalInfo: {
      fullName: String,
      email: String,
      phone: String,
      location: String,
      linkedin: String,
      github: String,
      portfolio: String,
      summary: String,
    },
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: String,
      endDate: String,
      gpa: String,
      achievements: [String],
    }],
    experience: [{
      company: String,
      title: String,
      location: String,
      startDate: String,
      endDate: String,
      current: Boolean,
      bullets: [String],
      technologies: [String],
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
      github: String,
      bullets: [String],
    }],
    skills: {
      technical: [String],
      frameworks: [String],
      tools: [String],
      soft: [String],
    },
    certifications: [{
      name: String,
      issuer: String,
      date: String,
      url: String,
    }],
    customSections: [{
      title: String,
      items: [{
        heading: String,
        subheading: String,
        date: String,
        link: String,
        bullets: [String],
      }],
    }],
  },
  atsAnalysis: {
    score: Number,
    keywordDensity: Number,
    formatting: Number,
    readability: Number,
    impact: Number,
    suggestions: [String],
    strengths: [String],
    analyzedAt: Date,
  },
}, { timestamps: true });

export default mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema);
