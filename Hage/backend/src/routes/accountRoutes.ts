import express from 'express';
import { getAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/accountController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount);

router.route('/:id')
  .put(protect, updateAccount)
  .delete(protect, deleteAccount);

export default router;
