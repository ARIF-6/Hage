import express from 'express';
import { createIssue } from '../controllers/adminController';
import { chatWithAi } from '../controllers/supportController';

const router = express.Router();

// Allow submitting a support issue (with or without auth token)
router.post('/', createIssue);

// 24/7 AI Live Chat Support Assistant
router.post('/ai-chat', chatWithAi);

export default router;
