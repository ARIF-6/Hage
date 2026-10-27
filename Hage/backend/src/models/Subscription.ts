import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  user: mongoose.Types.ObjectId;
  plan: 'Free' | 'Pro' | 'Premium' | '6 Months' | '1 Year';
  status: 'Active' | 'Expired' | 'Pending';
  paymentMethod?: 'Mastercard' | 'Visa' | 'PayPal' | 'EVC Plus' | 'Crypto' | 'Manual Admin';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['Free', 'Pro', 'Premium', '6 Months', '1 Year'], default: 'Free' },
  status: { type: String, enum: ['Active', 'Expired', 'Pending'], default: 'Active' },
  paymentMethod: { type: String, enum: ['Mastercard', 'Visa', 'PayPal', 'EVC Plus', 'Crypto', 'Manual Admin'], default: 'Manual Admin' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
}, { timestamps: true });

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
