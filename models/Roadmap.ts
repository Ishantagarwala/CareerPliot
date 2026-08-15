import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface ITopicSubtopic {
  id?: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface ITopicResource {
  title: string;
  url?: string;
  type?: 'video' | 'article' | 'course' | 'tool' | 'practice';
  free?: boolean;
}

export interface IYouTubeVideo {
  title: string;
  channel: string;
  url: string;
  duration?: string;
}

export interface IRoadmapTopic {
  id: string;
  title: string;
  description: string;
  type?: 'required' | 'recommended' | 'optional' | 'project' | 'career';
  whyItMatters?: string;
  nonTechTip?: string;
  timeEstimate?: string;
  subtopics?: ITopicSubtopic[];
  resources?: ITopicResource[];
  youtubeVideos?: IYouTubeVideo[];
  deliverable?: string;
  prerequisites?: string[];
  completed: boolean;
  completedAt?: Date;
}

export interface IMilestone {
  _id?: mongoose.Types.ObjectId;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface IRoadmapStage {
  name: 'beginner' | 'intermediate' | 'advanced';
  title?: string;
  description?: string;
  milestones: IMilestone[];
  topics?: IRoadmapTopic[];
}

export interface IRoadmap extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  careerPath: string;
  overview?: string;
  totalEstimatedWeeks?: string;
  targetRole?: string;
  stages: IRoadmapStage[];
  currentStage: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapSchema = new Schema<IRoadmap>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  careerPath: { type: String, required: true },
  overview: { type: String },
  totalEstimatedWeeks: { type: String },
  targetRole: { type: String },
  stages: [{
    name: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    title: { type: String },
    description: { type: String },
    milestones: [{
      title: { type: String, required: true },
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
    }],
    topics: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      type: { type: String, enum: ['required', 'recommended', 'optional', 'project', 'career'], default: 'required' },
      whyItMatters: { type: String },
      nonTechTip: { type: String },
      timeEstimate: { type: String },
      subtopics: [{
        id: { type: String },
        title: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
      }],
      resources: [{
        title: { type: String, required: true },
        url: { type: String },
        type: { type: String, enum: ['video', 'article', 'course', 'tool', 'practice'], default: 'article' },
        free: { type: Boolean, default: true },
      }],
      youtubeVideos: [{
        title: { type: String, required: true },
        channel: { type: String, required: true },
        url: { type: String, required: true },
        duration: { type: String },
      }],
      deliverable: { type: String },
      prerequisites: [{ type: String }],
      completed: { type: Boolean, default: false },
      completedAt: { type: Date },
    }],
  }],
  currentStage: { type: String, default: 'beginner', enum: ['beginner', 'intermediate', 'advanced'] },
}, { timestamps: true });

// One cached roadmap per user + career path so switching paths can reuse LLM results
RoadmapSchema.index({ userId: 1, careerPath: 1 }, { unique: true });

export default mongoose.models.Roadmap || mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);

