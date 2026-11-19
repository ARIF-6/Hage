import mongoose, { Schema, Document } from 'mongoose';

export interface ITradingChallenge extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  goalDescription: string;
  durationDays: number;
  dailyCommitment: string;
  personalRules: string[];
  coverImage?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  currentStreak: number;
  longestStreak: number;
  restoredStreak?: number;
  streakRestoredAt?: Date;
  completedDays: number;
  missedDays: number;
  completionPercentage: number;
  certificateId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TradingChallengeSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  goalDescription: { type: String, default: '' },
  durationDays: { type: Number, required: true },
  dailyCommitment: { type: String, default: '' },
  personalRules: [{ type: String }],
  coverImage: { type: String },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed', 'failed', 'abandoned'], default: 'active' },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  restoredStreak: { type: Number, default: 0 },
  streakRestoredAt: { type: Date },
  completedDays: { type: Number, default: 0 },
  missedDays: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  certificateId: { type: String },
}, { timestamps: true });

export default mongoose.model<ITradingChallenge>('TradingChallenge', TradingChallengeSchema);
