import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: Array<{ label: string; prompt: string }>;
  canEscalate?: boolean;
  feedback?: 'helpful' | 'unhelpful' | null;
  error?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    conversationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    suggestedActions: [
      {
        label: { type: String, required: true },
        prompt: { type: String, required: true }
      }
    ],
    canEscalate: { type: Boolean, default: false },
    feedback: { type: String, enum: ['helpful', 'unhelpful', null], default: null },
    error: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    _id: false
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
