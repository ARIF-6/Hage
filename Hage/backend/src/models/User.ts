import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  mt5Connected: boolean;
  resetPasswordOtp?: string;
  resetPasswordOtpExpires?: Date;
  isSuspended?: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: false },
  isVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isSuspended: { type: Boolean, default: false },
  lastLogin: { type: Date },
  mt5Connected: { type: Boolean, default: false },
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpires: { type: Date },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
