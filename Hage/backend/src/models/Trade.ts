import mongoose, { Schema, Document } from 'mongoose';

export interface ITrade extends Document {
  user: mongoose.Types.ObjectId;
  account: mongoose.Types.ObjectId;
  pair: string;
  riskPercent: number;
  result: 'Win' | 'Loss' | 'Breakeven';
  profitLossAmount: number;
  screenshotUrl?: string;
  notes?: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TradeSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  pair: { type: String, required: true },
  riskPercent: { type: Number, required: true },
  result: { type: String, enum: ['Win', 'Loss', 'Breakeven'], required: true },
  profitLossAmount: { type: Number, required: true },
  screenshotUrl: { type: String },
  notes: { type: String },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model<ITrade>('Trade', TradeSchema);
