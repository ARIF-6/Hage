import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemError extends Document {
  errorType: 'Database' | 'API' | 'Application' | 'Authentication' | 'Account Operation' | 'General';
  description: string;
  date: Date;
  relatedUser?: string; // sanitized email or user ID, no password/token
  status: 'Unresolved' | 'Investigating' | 'Resolved';
  endpoint?: string;
  statusCode?: number;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SystemErrorSchema: Schema = new Schema({
  errorType: { 
    type: String, 
    enum: ['Database', 'API', 'Application', 'Authentication', 'Account Operation', 'General'], 
    required: true 
  },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  relatedUser: { type: String },
  status: { type: String, enum: ['Unresolved', 'Investigating', 'Resolved'], default: 'Unresolved' },
  endpoint: { type: String },
  statusCode: { type: Number },
  adminNotes: { type: String },
}, { timestamps: true });

export default mongoose.model<ISystemError>('SystemError', SystemErrorSchema);
