import mongoose, { Schema, Document } from 'mongoose';

export interface IChallenge extends Document {
  user: mongoose.Types.ObjectId;
  size: number; // 5000, 10000, 25000, 50000, 100000
  dailyDrawdownLimit: number; // e.g., 3, 4, 5 (%)
  maxDrawdownLimit: number; // e.g., 8, 10, 12 (%)
  currentPhase: 'Phase 1' | 'Phase 2' | 'Funded';
  brokerName: string;
  status: 'Active' | 'Passed' | 'Failed';
  currentBalance: number;
  initialBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  size: { type: Number, required: true, enum: [5000, 10000, 25000, 50000, 100000] },
  dailyDrawdownLimit: { type: Number, required: true },
  maxDrawdownLimit: { type: Number, required: true },
  currentPhase: { type: String, enum: ['Phase 1', 'Phase 2', 'Funded'], default: 'Phase 1' },
  brokerName: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Passed', 'Failed'], default: 'Active' },
  currentBalance: { type: Number, required: true },
  initialBalance: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model<IChallenge>('Challenge', ChallengeSchema);
