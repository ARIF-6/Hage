import mongoose, { Schema, Document } from 'mongoose';

export interface ITradingCheckIn extends Document {
  challengeId: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  journalText: string;
  screenshotUrl?: string;
  screenshotName?: string;
  videoUrl?: string;
  videoName?: string;
  videoDuration?: number; // seconds <= 60
  status: 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const TradingCheckInSchema: Schema = new Schema({
  challengeId: { type: Schema.Types.ObjectId, ref: 'TradingChallenge', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  journalText: { type: String, default: '' },
  screenshotUrl: { type: String },
  screenshotName: { type: String },
  videoUrl: { type: String },
  videoName: { type: String },
  videoDuration: { type: Number },
  status: { type: String, enum: ['completed'], default: 'completed' },
}, { timestamps: true });

// Prevent duplicate submissions for the same challenge on the same date
TradingCheckInSchema.index({ challengeId: 1, date: 1 }, { unique: true });

export default mongoose.model<ITradingCheckIn>('TradingCheckIn', TradingCheckInSchema);
