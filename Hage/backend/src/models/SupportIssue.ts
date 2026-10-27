import mongoose, { Schema, Document } from 'mongoose';

export interface ISupportIssue extends Document {
  user: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  title: string;
  description: string;
  date: Date;
  status: 'Open' | 'In Progress' | 'Resolved';
  adminNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SupportIssueSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  userEmail: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
  adminNotes: { type: String, default: '' },
  resolvedAt: { type: Date },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ISupportIssue>('SupportIssue', SupportIssueSchema);
