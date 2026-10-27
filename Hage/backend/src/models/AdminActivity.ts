import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminActivity extends Document {
  admin: mongoose.Types.ObjectId;
  adminName: string;
  adminEmail: string;
  action: string; // e.g. "Suspended user", "Unsuspended user", "Resolved issue", etc.
  targetType: 'User' | 'Account' | 'Subscription' | 'Payout' | 'SupportIssue' | 'SystemError' | 'Settings';
  targetId?: string;
  details?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminActivitySchema: Schema = new Schema({
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  adminName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  action: { type: String, required: true },
  targetType: { 
    type: String, 
    enum: ['User', 'Account', 'Subscription', 'Payout', 'SupportIssue', 'SystemError', 'Settings'], 
    required: true 
  },
  targetId: { type: String },
  details: { type: String },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model<IAdminActivity>('AdminActivity', AdminActivitySchema);
