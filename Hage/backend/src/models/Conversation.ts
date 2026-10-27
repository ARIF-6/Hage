import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  userId: string;
  title: string;
  status: 'active' | 'archived';
  lastMessageAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, default: 'New Conversation' },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    lastMessageAt: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    _id: false
  }
);

ConversationSchema.index({ userId: 1, lastMessageAt: -1 });

export default mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
