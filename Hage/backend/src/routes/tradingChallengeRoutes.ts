import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getChallenges,
  createChallenge,
  getChallengeDetails,
  submitCheckIn,
  restoreStreak
} from '../controllers/tradingChallengeController';

const router = express.Router();

router.use(protect);

router.get('/', getChallenges);
router.post('/', createChallenge);
router.get('/:id', getChallengeDetails);
router.post('/:id/checkin', submitCheckIn);
router.post('/:id/restore-streak', restoreStreak);

export default router;
