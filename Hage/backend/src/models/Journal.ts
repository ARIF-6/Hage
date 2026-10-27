import mongoose, { Schema, Document } from 'mongoose';

export interface IJournal extends Document {
  user: mongoose.Types.ObjectId;
  account?: mongoose.Types.ObjectId;
  date: string;
  title: string;
  content: string;
  mood?: 'Disciplined' | 'Neutral' | 'Excited' | 'Frustrated' | 'Patient';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const JournalSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  account: { type: Schema.Types.ObjectId, ref: 'Account' },
  date: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  mood: { 
    type: String, 
    enum: ['Disciplined', 'Neutral', 'Excited', 'Frustrated', 'Patient'],
    default: 'Disciplined'
  },
  tags: [{ type: String }],
}, { timestamps: true });

export default mongoose.model<IJournal>('Journal', JournalSchema);
