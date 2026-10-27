import { Response } from 'express';
import Journal from '../models/Journal';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getJournalEntries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accountId } = req.query;
    const query: any = { user: req.user._id };
    if (accountId) {
      query.account = accountId;
    }

    const entries = await Journal.find(query).sort({ date: -1, createdAt: -1 });
    res.json(entries);
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, title, content, mood, tags, account } = req.body;

    if (!date || !title || !content) {
      res.status(400).json({ message: 'Date, title, and content are required' });
      return;
    }

    const entry = await Journal.create({
      user: req.user._id,
      account: account || undefined,
      date,
      title,
      content,
      mood: mood || 'Disciplined',
      tags: tags || []
    });

    res.status(201).json(entry);
  } catch (error) {
    console.error('Create journal entry error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, title, content, mood, tags, account } = req.body;

    const entry = await Journal.findById(id);

    if (!entry) {
      res.status(404).json({ message: 'Journal entry not found' });
      return;
    }

    if (entry.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    if (date) entry.date = date;
    if (title) entry.title = title;
    if (content !== undefined) entry.content = content;
    if (mood) entry.mood = mood;
    if (tags) entry.tags = tags;
    if (account !== undefined) entry.account = account || undefined;

    const updatedEntry = await entry.save();
    res.json(updatedEntry);
  } catch (error) {
    console.error('Update journal entry error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteJournalEntry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const entry = await Journal.findById(id);

    if (!entry) {
      res.status(404).json({ message: 'Journal entry not found' });
      return;
    }

    if (entry.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    await entry.deleteOne();
    res.json({ message: 'Journal entry removed' });
  } catch (error) {
    console.error('Delete journal entry error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
