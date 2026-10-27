import express from 'express';
import { getTrades, createTrade, updateTrade, deleteTrade } from '../controllers/tradeController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getTrades)
  .post(protect, createTrade);

router.route('/:id')
  .put(protect, updateTrade)
  .delete(protect, deleteTrade);

export default router;
