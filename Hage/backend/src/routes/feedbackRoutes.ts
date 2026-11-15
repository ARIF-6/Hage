import { Router } from 'express';
import {
  getFeedback,
  getAllFeedback,
  submitFeedback,
  approveFeedback,
  deleteFeedback,
} from '../controllers/feedbackController';
import { protect } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';

const router = Router();

// Public routes
router.get('/', getFeedback);           // approved only
router.post('/', submitFeedback);       // submit new (goes to pending)

// Admin routes
router.get('/all', protect, requireAdmin, getAllFeedback);
router.patch('/:id/approve', protect, requireAdmin, approveFeedback);
router.delete('/:id', protect, requireAdmin, deleteFeedback);

export default router;
