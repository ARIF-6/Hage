import express from 'express';
import { optionalAuth } from '../middlewares/optionalAuthMiddleware';
import {
  createConversation,
  getConversations,
  getConversationById,
  updateConversation,
  deleteConversation,
  sendMessage,
  submitFeedback,
  escalateToTicket,
  getKnowledgeBase
} from '../controllers/aiSupportController';

const router = express.Router();

router.use(optionalAuth);

// Conversation management
router.post('/conversations', createConversation);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationById);
router.patch('/conversations/:id', updateConversation);
router.delete('/conversations/:id', deleteConversation);

// Messaging & Feedback
router.post('/conversations/:id/messages', sendMessage);
router.post('/conversations/:id/feedback', submitFeedback);
router.post('/conversations/:id/escalate', escalateToTicket);

// Knowledge base inspection
router.get('/knowledge', getKnowledgeBase);

export default router;
