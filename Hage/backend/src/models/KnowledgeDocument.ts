import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeDocument extends Document {
  title: string;
  category: string;
  content: string;
  tags: string[];
  visibility: 'public' | 'trader' | 'admin';
  source?: string;
  updatedAt: Date;
  createdAt: Date;
}

const KnowledgeDocumentSchema: Schema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String, required: true, index: true },
    content: { type: String, required: true },
    tags: [{ type: String }],
    visibility: { type: String, enum: ['public', 'trader', 'admin'], default: 'public' },
    source: { type: String, default: 'HAGE Documentation' }
  },
  {
    timestamps: true,
    _id: false
  }
);

KnowledgeDocumentSchema.index({ title: 'text', content: 'text', tags: 'text' });

export default mongoose.models.KnowledgeDocument || mongoose.model<IKnowledgeDocument>('KnowledgeDocument', KnowledgeDocumentSchema);
