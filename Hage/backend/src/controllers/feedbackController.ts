import { Request, Response } from 'express';
import { dbManager } from '../config/dbManager';

export interface Feedback {
  _id: string;
  name: string;
  role: string;        // e.g. "Funded Trader", "Prop Trader", etc.
  rating: number;      // 1–5
  message: string;
  approved: boolean;   // admin can approve/hide
  createdAt: string;
}

// GET /api/feedback — public, only returns approved ones
export const getFeedback = (req: Request, res: Response) => {
  try {
    const store = dbManager.getStore() as any;
    const all: Feedback[] = store.feedback || [];
    const approved = all.filter((f) => f.approved);
    return res.json(approved);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load feedback.' });
  }
};

// GET /api/feedback/all — admin only, returns all feedback
export const getAllFeedback = (req: Request, res: Response) => {
  try {
    const store = dbManager.getStore() as any;
    const all: Feedback[] = store.feedback || [];
    return res.json(all);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to load feedback.' });
  }
};

// POST /api/feedback — public, submit new feedback (auto-pending)
export const submitFeedback = (req: Request, res: Response) => {
  try {
    const { name, role, rating, message } = req.body;

    if (!name || !message || !rating) {
      return res.status(400).json({ message: 'Name, message, and rating are required.' });
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
    }
    if (message.trim().length < 10) {
      return res.status(400).json({ message: 'Feedback message must be at least 10 characters.' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }

    const store = dbManager.getStore() as any;
    if (!store.feedback) store.feedback = [];

    const newFeedback: Feedback = {
      _id: 'fb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: name.trim().slice(0, 80),
      role: (role || 'Trader').trim().slice(0, 60),
      rating: Math.round(rating),
      message: message.trim().slice(0, 500),
      approved: false, // must be approved by admin before showing publicly
      createdAt: new Date().toISOString(),
    };

    store.feedback.unshift(newFeedback);
    dbManager.saveToDisk();

    return res.status(201).json({ message: 'Thank you! Your feedback has been submitted for review.', feedback: newFeedback });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to submit feedback.' });
  }
};

// PATCH /api/feedback/:id/approve — admin only
export const approveFeedback = (req: Request, res: Response) => {
  try {
    const store = dbManager.getStore() as any;
    if (!store.feedback) store.feedback = [];

    const item = store.feedback.find((f: Feedback) => f._id === req.params.id);
    if (!item) return res.status(404).json({ message: 'Feedback not found.' });

    item.approved = true;
    dbManager.saveToDisk();
    return res.json({ message: 'Feedback approved.', feedback: item });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to approve feedback.' });
  }
};

// DELETE /api/feedback/:id — admin only
export const deleteFeedback = (req: Request, res: Response) => {
  try {
    const store = dbManager.getStore() as any;
    if (!store.feedback) store.feedback = [];

    const idx = store.feedback.findIndex((f: Feedback) => f._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Feedback not found.' });

    store.feedback.splice(idx, 1);
    dbManager.saveToDisk();
    return res.json({ message: 'Feedback deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete feedback.' });
  }
};

