import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: 'Free' | 'Starter' | 'Pro' | 'Premium' | '6 Months' | '1 Year';
  status: 'Active' | 'Expired' | 'Pending';
  paymentMethod?: 'Mastercard' | 'Visa' | 'PayPal' | 'EVC Plus' | 'Crypto' | 'Manual Admin';
  nowPaymentId?: string;
  nowOrderId?: string;
  amount?: number;
  duration?: string;
  priceCurrency?: string;
  payCurrency?: string;
  userWalletAddress?: string;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['Free', 'Starter', 'Pro', 'Premium', '6 Months', '1 Year'], default: 'Free' },
  status: { type: String, enum: ['Active', 'Expired', 'Pending'], default: 'Active' },
  paymentMethod: { type: String, enum: ['Mastercard', 'Visa', 'PayPal', 'EVC Plus', 'Crypto', 'Manual Admin'], default: 'Manual Admin' },
  nowPaymentId: { type: String, index: true },
  nowOrderId: { type: String, index: true },
  amount: { type: Number },
  duration: { type: String },
  priceCurrency: { type: String, default: 'usd' },
  payCurrency: { type: String, default: 'usdtbsc' },
  userWalletAddress: { type: String },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
