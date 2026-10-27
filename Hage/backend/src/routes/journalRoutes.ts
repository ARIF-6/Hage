import express from 'express';
import { 
  getJournalEntries, 
  createJournalEntry, 
  updateJournalEntry, 
  deleteJournalEntry 
} from '../controllers/journalController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getJournalEntries)
  .post(protect, createJournalEntry);

router.route('/:id')
  .put(protect, updateJournalEntry)
  .delete(protect, deleteJournalEntry);

export default router;
