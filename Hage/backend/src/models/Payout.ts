import mongoose, { Schema, Document } from 'mongoose';

export interface IPayout extends Document {
  user: mongoose.Types.ObjectId;
  account: mongoose.Types.ObjectId;
  userName?: string;
  userEmail?: string;
  accountName: string;
  accountNumber?: string;
  broker?: string;
  amount: number;
  date: Date;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  balanceBefore: number;
  balanceAfter: number;
  rejectionReason?: string;
  notes?: string;
  proofUrl?: string;
  proofName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  userName: { type: String },
  userEmail: { type: String },
  accountName: { type: String, required: true },
  accountNumber: { type: String },
  broker: { type: String },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Completed'], default: 'Pending' },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  rejectionReason: { type: String },
  notes: { type: String },
  proofUrl: { type: String },
  proofName: { type: String },
}, { timestamps: true });

export default mongoose.model<IPayout>('Payout', PayoutSchema);
