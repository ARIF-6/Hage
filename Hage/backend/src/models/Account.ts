import mongoose, { Schema, Document } from 'mongoose';

export interface IAccount extends Document {
  user: mongoose.Types.ObjectId;
  name: string; // e.g., $100K Funded Account, $50K Challenge, Real Personal MT5
  accountType: 'Prop Firm' | 'Real Account';
  broker: string;
  accountNumber?: string;
  platform?: 'MT4' | 'MT5' | 'cTrader' | 'DXTrade' | 'Match-Trader' | 'Other';
  phase: 'Phase 1' | 'Phase 2' | 'Funded' | 'Real Account';
  status: 'Active' | 'Passed' | 'Failed' | 'Closed' | 'Archived';
  initialBalance: number;
  currentBalance: number;
  profitTarget?: number; // dollar amount (Prop firm challenges only)
  profitTargetPercent?: number; // % (Prop firm challenges only)
  maxDailyDrawdown?: number; // dollar amount (Prop firm only)
  maxDrawdown?: number; // dollar amount (Prop firm only)
  failureReason?: string;
  passedDate?: Date;
  failedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  accountType: { type: String, enum: ['Prop Firm', 'Real Account'], default: 'Prop Firm' },
  broker: { type: String, default: 'Prop Firm' },
  accountNumber: { type: String },
  platform: { type: String, enum: ['MT4', 'MT5', 'cTrader', 'DXTrade', 'Match-Trader', 'Other'], default: 'MT5' },
  phase: { type: String, enum: ['Phase 1', 'Phase 2', 'Funded', 'Real Account'], default: 'Funded' },
  status: { type: String, enum: ['Active', 'Passed', 'Failed', 'Closed', 'Archived'], default: 'Active' },
  initialBalance: { type: Number, required: true },
  currentBalance: { type: Number, required: true },
  profitTarget: { type: Number },
  profitTargetPercent: { type: Number },
  maxDailyDrawdown: { type: Number },
  maxDrawdown: { type: Number },
  failureReason: { type: String },
  passedDate: { type: Date },
  failedDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<IAccount>('Account', AccountSchema);
