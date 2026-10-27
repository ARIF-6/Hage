import { Response } from 'express';
import Trade from '../models/Trade';
import Account from '../models/Account';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getTrades = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accountId } = req.query;
    
    let query: any = { user: req.user._id };
    if (accountId) {
      query.account = accountId;
    }

    const trades = await Trade.find(query).sort({ date: -1 });
    res.json(trades);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { account, pair, date, riskPercent, result, profitLossAmount, notes, screenshotUrl } = req.body;

    if (!account || !pair || !date || riskPercent === undefined || !result || profitLossAmount === undefined) {
      res.status(400).json({ message: 'Please provide all required fields' });
      return;
    }

    const accountExists = await Account.findById(account);
    if (!accountExists || accountExists.user.toString() !== req.user._id.toString()) {
      res.status(404).json({ message: 'Account not found or not authorized' });
      return;
    }

    const trade = await Trade.create({
      user: req.user._id,
      account,
      pair,
      date,
      riskPercent,
      result,
      profitLossAmount,
      notes,
      screenshotUrl
    });

    // Update account balance
    accountExists.currentBalance += profitLossAmount;
    await accountExists.save();

    res.status(201).json(trade);
  } catch (error) {
    console.error('Create trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { pair, date, riskPercent, result, profitLossAmount, notes, screenshotUrl } = req.body;

    const trade = await Trade.findById(id);

    if (!trade) {
      res.status(404).json({ message: 'Trade not found' });
      return;
    }

    if (trade.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    // Adjust account balance if profitLossAmount changed
    if (profitLossAmount !== undefined && profitLossAmount !== trade.profitLossAmount) {
      const account = await Account.findById(trade.account);
      if (account) {
        account.currentBalance = account.currentBalance - trade.profitLossAmount + profitLossAmount;
        await account.save();
      }
    }

    trade.pair = pair || trade.pair;
    trade.date = date || trade.date;
    if (riskPercent !== undefined) trade.riskPercent = riskPercent;
    trade.result = result || trade.result;
    if (profitLossAmount !== undefined) trade.profitLossAmount = profitLossAmount;
    trade.notes = notes !== undefined ? notes : trade.notes;
    trade.screenshotUrl = screenshotUrl !== undefined ? screenshotUrl : trade.screenshotUrl;

    const updatedTrade = await trade.save();
    res.json(updatedTrade);
  } catch (error) {
    console.error('Update trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTrade = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const trade = await Trade.findById(id);

    if (!trade) {
      res.status(404).json({ message: 'Trade not found' });
      return;
    }

    if (trade.user.toString() !== req.user._id.toString()) {
      res.status(401).json({ message: 'User not authorized' });
      return;
    }

    // Revert account balance
    const account = await Account.findById(trade.account);
    if (account) {
      account.currentBalance -= trade.profitLossAmount;
      await account.save();
    }

    await trade.deleteOne();
    res.json({ message: 'Trade removed' });
  } catch (error) {
    console.error('Delete trade error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
