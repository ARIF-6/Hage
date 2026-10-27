import { Response } from 'express';
import Account from '../models/Account';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const accounts = await Account.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, initialBalance } = req.body;

    if (!name || initialBalance === undefined) {
      res.status(400).json({ message: 'Name and initial balance are required' });
      return;
    }

    const account = await Account.create({
      user: req.user._id,
      name,
      initialBalance,
      currentBalance: initialBalance,
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, currentBalance, status } = req.body;

    const account = await Account.findById(id);

    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    if (account.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    account.name = name || account.name;
    if (currentBalance !== undefined) account.currentBalance = currentBalance;
    account.status = status || account.status;

    const updatedAccount = await account.save();
    res.json(updatedAccount);
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id);

    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    if (account.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    await account.deleteOne();
    res.json({ message: 'Account removed' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
