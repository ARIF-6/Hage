import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dbManager } from '../config/dbManager';
import User from '../models/User';
import fs from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';

export const getOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();

    const totalUsers = store.users.length;
    const activeUsers = store.users.filter(u => !u.isSuspended).length;

    const totalAccounts = store.accounts.length;
    const activeAccounts = store.accounts.filter(a => a.status === 'Active').length;
    const passedAccounts = store.accounts.filter(a => a.status === 'Passed').length;
    const failedAccounts = store.accounts.filter(a => a.status === 'Failed').length;
    const fundedAccounts = store.accounts.filter(a => a.phase === 'Funded').length;
    const realAccounts = store.accounts.filter(a => a.phase === 'Real Account' || a.accountType === 'Real Account').length;

    const totalTrades = store.trades.length;
    const totalPayoutRecords = store.payouts.length;
    
    // Total Paid Out: sum of Approved and Completed payouts
    const approvedPayouts = store.payouts.filter(p => p.status === 'Approved' || p.status === 'Completed');
    const totalPaidOut = approvedPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Subscription plan counts
    const freeUsers = store.subscriptions.filter(s => s.plan === 'Free').length;
    const proUsers = store.subscriptions.filter(s => s.plan === 'Pro').length;
    const premiumUsers = store.subscriptions.filter(s => s.plan === 'Premium').length;

    // Recent Activity Feeds (sorted latest first)
    const recentUserActivity = store.users
      .slice(-5)
      .reverse()
      .map(u => ({
        id: u._id,
        user: u.name,
        email: u.email,
        action: u.isSuspended ? 'Account Suspended' : 'User Active',
        role: u.role,
        date: u.updatedAt || u.createdAt
      }));

    const recentAccountActivity = store.accounts
      .slice(-5)
      .reverse()
      .map(a => {
        const owner = store.users.find(u => u._id === a.user);
        return {
          id: a._id,
          name: a.name,
          user: owner ? owner.name : 'Trader',
          broker: a.broker,
          phase: a.phase,
          status: a.status,
          currentBalance: a.currentBalance,
          date: a.updatedAt || a.createdAt
        };
      });

    const recentPayoutActivity = store.payouts
      .slice(-5)
      .reverse()
      .map(p => ({
        id: p._id,
        user: p.userName || 'Trader',
        account: p.accountName,
        amount: p.amount,
        status: p.status,
        date: p.date
      }));

    const recentSystemIssues = store.supportIssues
      .filter(i => i.status !== 'Resolved')
      .slice(-5)
      .reverse()
      .map(i => ({
        id: i._id,
        user: i.userName || 'Trader',
        title: i.title,
        status: i.status,
        date: i.date
      }));

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalAccounts,
        activeAccounts,
        passedAccounts,
        failedAccounts,
        fundedAccounts,
        realAccounts,
        totalTrades,
        totalPayoutRecords,
        totalPaidOut,
        freeUsers,
        proUsers,
        premiumUsers
      },
      recentUserActivity,
      recentAccountActivity,
      recentPayoutActivity,
      recentSystemIssues
    });
  } catch (error) {
    console.error('Admin Overview Error:', error);
    res.status(500).json({ message: 'Failed to generate admin overview' });
  }
};

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const query = (req.query.q as string || '').toLowerCase();
    const roleFilter = req.query.role as string;
    const statusFilter = req.query.status as string;

    let users = store.users.map(u => {
      const userAccounts = store.accounts.filter(a => a.user === u._id);
      const userTrades = store.trades.filter(t => t.user === u._id);
      const userSub = store.subscriptions.find(s => s.user === u._id);
      const userPayouts = store.payouts.filter(p => p.user === u._id);

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        isSuspended: Boolean(u.isSuspended),
        accountsCount: userAccounts.length,
        tradesCount: userTrades.length,
        subscriptionPlan: userSub ? userSub.plan : 'Free',
        subscriptionStatus: userSub ? userSub.status : 'Active',
        totalPaidOut: userPayouts
          .filter(p => p.status === 'Approved' || p.status === 'Completed')
          .reduce((sum, p) => sum + p.amount, 0),
        createdAt: u.createdAt,
        lastLogin: u.lastLogin || u.updatedAt
      };
    });

    if (query) {
      users = users.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }

    if (roleFilter && roleFilter !== 'all') {
      users = users.filter(u => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'suspended') {
        users = users.filter(u => u.isSuspended);
      } else if (statusFilter === 'active') {
        users = users.filter(u => !u.isSuspended);
      }
    }

    res.json(users);
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = dbManager.getStore();

    const user = store.users.find(u => u._id === id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const accounts = store.accounts.filter(a => a.user === id);
    const trades = store.trades.filter(t => t.user === id);
    const subscription = store.subscriptions.find(s => s.user === id);
    const payouts = store.payouts.filter(p => p.user === id);
    const issues = store.supportIssues.filter(i => i.user === id);

    // Sanitize user object (no passwordHash)
    const { passwordHash, ...sanitizedUser } = user;

    res.json({
      user: sanitizedUser,
      accounts,
      trades,
      subscription: subscription || { plan: 'Free', status: 'Active' },
      payouts,
      issues
    });
  } catch (error) {
    console.error('Get User Details Error:', error);
    res.status(500).json({ message: 'Failed to retrieve user details' });
  }
};

export const suspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = dbManager.getStore();

    const user = store.users.find(u => u._id === id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (user.role === 'admin' && user._id === req.user?._id) {
      res.status(400).json({ message: 'Cannot suspend your own admin account' });
      return;
    }

    user.isSuspended = true;
    user.updatedAt = new Date().toISOString();

    // Log admin audit
    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Suspended User',
      targetType: 'User',
      targetId: id,
      details: `Suspended user account for ${user.name} (${user.email})`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: `User ${user.name} suspended successfully`, user });
  } catch (error) {
    console.error('Suspend User Error:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
};

export const unsuspendUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = dbManager.getStore();

    const user = store.users.find(u => u._id === id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.isSuspended = false;
    user.updatedAt = new Date().toISOString();

    // Log admin audit
    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Unsuspended User',
      targetType: 'User',
      targetId: id,
      details: `Unsuspended user account for ${user.name} (${user.email})`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: `User ${user.name} unsuspended successfully`, user });
  } catch (error) {
    console.error('Unsuspend User Error:', error);
    res.status(500).json({ message: 'Failed to unsuspend user' });
  }
};

export const getAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const typeFilter = req.query.type as string; // 'Active' | 'Passed' | 'Failed' | 'Funded' | 'Real' | 'all'

    let accounts = store.accounts.map(a => {
      const owner = store.users.find(u => u._id === a.user);
      const accTrades = store.trades.filter(t => t.account === a._id);
      const netPnl = a.currentBalance - a.initialBalance;
      const pnlPercent = a.initialBalance > 0 ? ((netPnl / a.initialBalance) * 100) : 0;

      return {
        ...a,
        userName: owner ? owner.name : 'Unknown Trader',
        userEmail: owner ? owner.email : '',
        tradesCount: accTrades.length,
        netPnl,
        pnlPercent
      };
    });

    if (typeFilter && typeFilter !== 'all') {
      if (typeFilter === 'Active') {
        accounts = accounts.filter(a => a.status === 'Active');
      } else if (typeFilter === 'Passed') {
        accounts = accounts.filter(a => a.status === 'Passed');
      } else if (typeFilter === 'Failed') {
        accounts = accounts.filter(a => a.status === 'Failed');
      } else if (typeFilter === 'Funded') {
        accounts = accounts.filter(a => a.phase === 'Funded');
      } else if (typeFilter === 'Real') {
        accounts = accounts.filter(a => a.phase === 'Real Account' || a.accountType === 'Real Account');
      }
    }

    res.json(accounts);
  } catch (error) {
    console.error('Get Accounts Error:', error);
    res.status(500).json({ message: 'Failed to retrieve accounts' });
  }
};

export const getAccountById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = dbManager.getStore();

    const account = store.accounts.find(a => a._id === id);
    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    const owner = store.users.find(u => u._id === account.user);
    const trades = store.trades.filter(t => t.account === id || t.campaignId === id);
    const payouts = store.payouts.filter(p => p.account === id || p.campaignId === id);
    const netPnl = account.currentBalance - account.initialBalance;

    res.json({
      account: {
        ...account,
        userName: owner ? owner.name : 'Trader',
        userEmail: owner ? owner.email : '',
        netPnl,
        pnlPercent: account.initialBalance > 0 ? ((netPnl / account.initialBalance) * 100) : 0,
      },
      trades,
      payouts
    });
  } catch (error) {
    console.error('Get Account Details Error:', error);
    res.status(500).json({ message: 'Failed to fetch account details' });
  }
};

export const updateAccountStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, failureReason } = req.body;
    const store = dbManager.getStore();

    const account = store.accounts.find(a => a._id === id);
    if (!account) {
      res.status(404).json({ message: 'Account not found' });
      return;
    }

    account.status = status;
    if (failureReason !== undefined) account.failureReason = failureReason;
    if (status === 'Active') {
      account.failureReason = undefined;
    }
    if (status === 'Passed') {
      account.passedDate = new Date().toISOString();
    }
    if (status === 'Failed') {
      account.failedDate = new Date().toISOString();
    }
    account.updatedAt = new Date().toISOString();

    // Log admin intervention
    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Updated Account Status',
      targetType: 'Account',
      targetId: id,
      details: `Administrative status change for "${account.name}" (${account.broker}) to ${status}${failureReason ? `: ${failureReason}` : ''}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: `Account status updated to ${status}`, account });
  } catch (error) {
    console.error('Update Account Status Error:', error);
    res.status(500).json({ message: 'Failed to update account status' });
  }
};


export const getIssues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const statusFilter = req.query.status as string;

    let issues = [...store.supportIssues];

    if (statusFilter && statusFilter !== 'all') {
      issues = issues.filter(i => i.status === statusFilter);
    }

    res.json(issues);
  } catch (error) {
    console.error('Get Issues Error:', error);
    res.status(500).json({ message: 'Failed to fetch support issues' });
  }
};

export const createIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { 
      title, 
      description, 
      firstName, 
      lastName, 
      name, 
      email, 
      message, 
      subject,
      category 
    } = req.body;
    const store = dbManager.getStore();

    const fullName = (name || `${firstName || ''} ${lastName || ''}`.trim()) || req.user?.name || 'Contact Visitor';
    const userEmail = email || req.user?.email || '';
    const resolvedDescription = description || message;

    if (!resolvedDescription) {
      res.status(400).json({ message: 'A message or description is required' });
      return;
    }

    const resolvedTitle = title || subject || (fullName !== 'Contact Visitor' ? `Contact from ${fullName}` : 'Website Contact Message');

    const newIssue = {
      _id: 'iss_' + Date.now(),
      user: req.user?._id || 'contact_' + Date.now(),
      userName: fullName,
      userEmail: userEmail,
      title: resolvedTitle,
      description: resolvedDescription,
      category: category || (firstName || message ? 'Contact Message' : 'General Support'),
      date: new Date().toISOString(),
      status: 'Open',
      adminNotes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.supportIssues.unshift(newIssue);
    dbManager.saveToDisk();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully! Our team will get back to you shortly.',
      issue: newIssue
    });
  } catch (error) {
    console.error('Create Issue Error:', error);
    res.status(500).json({ message: 'Failed to submit contact message' });
  }
};

export const updateIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const store = dbManager.getStore();

    const issue = store.supportIssues.find(i => i._id === id);
    if (!issue) {
      res.status(404).json({ message: 'Issue not found' });
      return;
    }

    if (status) issue.status = status;
    if (adminNotes !== undefined) issue.adminNotes = adminNotes;
    if (status === 'Resolved') {
      issue.resolvedAt = new Date().toISOString();
    }
    issue.updatedAt = new Date().toISOString();

    // Log admin audit
    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: status === 'Resolved' ? 'Resolved Support Issue' : 'Updated Support Issue',
      targetType: 'SupportIssue',
      targetId: id,
      details: `Updated issue "${issue.title}" status to "${issue.status}"`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: 'Issue updated successfully', issue });
  } catch (error) {
    console.error('Update Issue Error:', error);
    res.status(500).json({ message: 'Failed to update issue' });
  }
};

export const getSystemErrors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const typeFilter = req.query.type as string;
    const statusFilter = req.query.status as string;

    let errors = [...store.systemErrors];

    if (typeFilter && typeFilter !== 'all') {
      errors = errors.filter(e => e.errorType === typeFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      errors = errors.filter(e => e.status === statusFilter);
    }

    res.json(errors);
  } catch (error) {
    console.error('Get System Errors Error:', error);
    res.status(500).json({ message: 'Failed to fetch system errors' });
  }
};

export const resolveSystemError = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const store = dbManager.getStore();

    const err = store.systemErrors.find(e => e._id === id);
    if (!err) {
      res.status(404).json({ message: 'System error record not found' });
      return;
    }

    if (status) err.status = status;
    if (adminNotes !== undefined) err.adminNotes = adminNotes;
    err.updatedAt = new Date().toISOString();

    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Resolved System Error',
      targetType: 'SystemError',
      targetId: id,
      details: `Marked system error [${err.errorType}] as ${err.status}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: 'System error status updated', error: err });
  } catch (error) {
    console.error('Resolve Error Note Error:', error);
    res.status(500).json({ message: 'Failed to update system error' });
  }
};

export const resolveAllSystemErrors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const { status = 'Resolved', adminNotes = 'Bulk resolved by administrator' } = req.body;
    let count = 0;
    store.systemErrors.forEach(err => {
      if (err.status !== 'Resolved') {
        err.status = status;
        err.adminNotes = err.adminNotes ? `${err.adminNotes} | ${adminNotes}` : adminNotes;
        err.updatedAt = new Date().toISOString();
        count++;
      }
    });

    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Resolved All System Errors',
      targetType: 'SystemError',
      targetId: 'all',
      details: `Bulk marked ${count} system errors as ${status}`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: `Successfully resolved ${count} system errors`, count });
  } catch (error) {
    console.error('Resolve All System Errors Error:', error);
    res.status(500).json({ message: 'Failed to resolve all system errors' });
  }
};

export const getSubscriptions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();

    const freeCount = store.subscriptions.filter(s => s.plan === 'Free').length;
    const proCount = store.subscriptions.filter(s => s.plan === 'Pro').length;
    const premiumCount = store.subscriptions.filter(s => s.plan === 'Premium').length;
    const activeCount = store.subscriptions.filter(s => s.status === 'Active').length;
    const expiredCount = store.subscriptions.filter(s => s.status === 'Expired').length;

    const list = store.subscriptions.map(s => {
      const user = store.users.find(u => u._id === s.user);
      return {
        ...s,
        userName: user ? user.name : 'Trader',
        userEmail: user ? user.email : '',
      };
    });

    res.json({
      summary: {
        freeCount,
        proCount,
        premiumCount,
        activeCount,
        expiredCount,
        totalSubscriptions: store.subscriptions.length
      },
      subscriptions: list
    });
  } catch (error) {
    console.error('Get Subscriptions Error:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
};

export const updateSubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { plan, status } = req.body;
    const store = dbManager.getStore();

    const target = String(userId || '').trim();
    const user = store.users.find(u => u._id === target || u.email.toLowerCase() === target.toLowerCase());
    let sub = store.subscriptions.find(s => 
      s.user === target || 
      (user && s.user === user._id) || 
      (user && s.userEmail && s.userEmail.toLowerCase() === user.email.toLowerCase()) ||
      (s.userEmail && s.userEmail.toLowerCase() === target.toLowerCase())
    );

    if (!sub) {
      sub = {
        _id: 'sub_' + Date.now(),
        user: user ? user._id : target,
        userName: user?.name || 'Trader',
        userEmail: user?.email || (target.includes('@') ? target : ''),
        plan: plan || 'Free',
        status: status || 'Active',
        paymentMethod: 'Manual Admin',
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      store.subscriptions.push(sub);
    } else {
      if (plan) sub.plan = plan;
      if (status) sub.status = status;
      sub.paymentMethod = 'Manual Admin';
      if (user && !sub.userEmail) sub.userEmail = user.email;
      if (user && !sub.userName) sub.userName = user.name;
      sub.updatedAt = new Date().toISOString();
    }

    if (user) {
      (user as any).subscriptionPlan = plan || sub.plan;
      (user as any).subscriptionStatus = status || sub.status;
      (user as any).subscriptionPaymentMethod = 'Manual Admin';
    }

    if (dbManager.getIsMongoConnected()) {
      try {
        await User.findByIdAndUpdate(userId, {
          subscriptionPlan: plan || sub.plan,
          subscriptionStatus: status || sub.status
        });
      } catch (_) {}
    }

    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Updated Subscription',
      targetType: 'Subscription',
      targetId: sub._id,
      details: `Updated subscription for ${user?.name || 'User'} to ${sub.plan} (${sub.status})`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: 'Subscription updated successfully', subscription: sub });
  } catch (error) {
    console.error('Update Subscription Error:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
};

export const getPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const statusFilter = req.query.status as string;

    let payouts = [...store.payouts];
    if (statusFilter && statusFilter !== 'all') {
      payouts = payouts.filter(p => p.status === statusFilter);
    }

    const approvedTotal = store.payouts
      .filter(p => p.status === 'Approved' || p.status === 'Completed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pendingCount = store.payouts.filter(p => p.status === 'Pending').length;
    const approvedCount = store.payouts.filter(p => p.status === 'Approved' || p.status === 'Completed').length;
    const rejectedCount = store.payouts.filter(p => p.status === 'Rejected').length;

    res.json({
      summary: {
        totalPaidOut: approvedTotal,
        totalPayoutsCount: store.payouts.length,
        pendingCount,
        approvedCount,
        rejectedCount
      },
      payouts
    });
  } catch (error) {
    console.error('Get Payouts Error:', error);
    res.status(500).json({ message: 'Failed to retrieve payout records' });
  }
};

export const approvePayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const store = dbManager.getStore();

    const payout = store.payouts.find(p => p._id === id);
    if (!payout) {
      res.status(404).json({ message: 'Payout record not found' });
      return;
    }

    payout.status = 'Approved';
    payout.updatedAt = new Date().toISOString();

    // Deduct balance from the associated account
    const account = store.accounts.find(a => a._id === payout.account);
    if (account) {
      account.currentBalance = Math.max(0, account.currentBalance - payout.amount);
      account.updatedAt = new Date().toISOString();
    }

    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Approved Payout Request',
      targetType: 'Payout',
      targetId: id,
      details: `Approved payout of $${payout.amount.toLocaleString()} for ${payout.userName} (${payout.accountName})`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: 'Payout approved successfully', payout, account });
  } catch (error) {
    console.error('Approve Payout Error:', error);
    res.status(500).json({ message: 'Failed to approve payout' });
  }
};

export const rejectPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const store = dbManager.getStore();

    const payout = store.payouts.find(p => p._id === id);
    if (!payout) {
      res.status(404).json({ message: 'Payout record not found' });
      return;
    }

    payout.status = 'Rejected';
    payout.rejectionReason = rejectionReason || 'Payout conditions not met under account rules';
    payout.updatedAt = new Date().toISOString();

    store.adminActivities.unshift({
      _id: 'act_' + Date.now(),
      admin: req.user?._id || 'admin',
      adminName: req.user?.name || 'Admin',
      adminEmail: req.user?.email || 'admin@hage.com',
      action: 'Rejected Payout Request',
      targetType: 'Payout',
      targetId: id,
      details: `Rejected payout of $${payout.amount.toLocaleString()} for ${payout.userName}: "${payout.rejectionReason}"`,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    dbManager.saveToDisk();
    res.json({ message: 'Payout rejected successfully', payout });
  } catch (error) {
    console.error('Reject Payout Error:', error);
    res.status(500).json({ message: 'Failed to reject payout' });
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();

    // 1. User Statistics
    const totalUsers = store.users.length;
    const activeUsers = store.users.filter(u => !u.isSuspended).length;
    const suspendedUsers = store.users.filter(u => u.isSuspended).length;
    const verifiedUsers = store.users.filter(u => u.isVerified).length;

    // 2. Account Statistics
    const totalAccounts = store.accounts.length;
    const activeAccounts = store.accounts.filter(a => a.status === 'Active').length;
    const passedAccounts = store.accounts.filter(a => a.status === 'Passed').length;
    const failedAccounts = store.accounts.filter(a => a.status === 'Failed').length;
    const fundedAccounts = store.accounts.filter(a => a.phase === 'Funded').length;
    const realAccounts = store.accounts.filter(a => a.phase === 'Real Account' || a.accountType === 'Real Account').length;
    const passRate = totalAccounts > 0 ? ((passedAccounts / totalAccounts) * 100).toFixed(1) : '0.0';

    // 3. Trade Statistics
    const totalTrades = store.trades.length;
    const winningTrades = store.trades.filter(t => t.result === 'Win').length;
    const losingTrades = store.trades.filter(t => t.result === 'Loss').length;
    const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';
    const totalProfit = store.trades.filter(t => t.profitLossAmount > 0).reduce((s, t) => s + t.profitLossAmount, 0);
    const totalLoss = Math.abs(store.trades.filter(t => t.profitLossAmount < 0).reduce((s, t) => s + t.profitLossAmount, 0));
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : (totalProfit > 0 ? 'Max' : '0.00');

    // 4. Subscription Statistics
    const freeCount = store.subscriptions.filter(s => s.plan === 'Free').length;
    const proCount = store.subscriptions.filter(s => s.plan === 'Pro').length;
    const premiumCount = store.subscriptions.filter(s => s.plan === 'Premium').length;

    // 5. Payout Statistics
    const totalPayouts = store.payouts.length;
    const approvedPayouts = store.payouts.filter(p => p.status === 'Approved' || p.status === 'Completed');
    const totalPaidOut = approvedPayouts.reduce((s, p) => s + p.amount, 0);
    const avgPayout = approvedPayouts.length > 0 ? Math.round(totalPaidOut / approvedPayouts.length) : 0;

    res.json({
      userStats: { totalUsers, activeUsers, suspendedUsers, verifiedUsers },
      accountStats: { totalAccounts, activeAccounts, passedAccounts, failedAccounts, fundedAccounts, realAccounts, passRate },
      tradeStats: { totalTrades, winningTrades, losingTrades, winRate, totalProfit, totalLoss, profitFactor },
      subscriptionStats: { freeCount, proCount, premiumCount },
      payoutStats: { totalPayouts, totalPaidOut, avgPayout, approvedCount: approvedPayouts.length }
    });
  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ message: 'Failed to generate reports' });
  }
};

export const getActivityLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    res.json(store.adminActivities);
  } catch (error) {
    console.error('Get Activity Logs Error:', error);
    res.status(500).json({ message: 'Failed to fetch admin activity logs' });
  }
};

// ─── Subscription Pricing Settings ────────────────────────────────────────────

const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

// In-memory cache to avoid disk reads on every pricing request
let _cachedSettings: any = null;

const loadSettings = () => {
  if (_cachedSettings) return _cachedSettings;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      _cachedSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return _cachedSettings;
    }
  } catch {}
  _cachedSettings = {
    subscriptionPricing: {
      Starter: { monthly: 2.99, annual: 29.99, currency: 'USD' },
      Pro:     { monthly: 4.99, annual: 49.99, currency: 'USD' },
      Premium: { monthly: 9.99, annual: 99.99, currency: 'USD' }
    }
  };
  return _cachedSettings;
};

const saveSettings = (data: any) => {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  _cachedSettings = data; // update in-memory cache immediately
  writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8').catch(err => {
    console.error('Error saving settings file:', err);
  });
};

export const getPricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = loadSettings();
    res.json({ pricing: settings.subscriptionPricing });
  } catch (error) {
    console.error('Get Pricing Error:', error);
    res.status(500).json({ message: 'Failed to fetch pricing' });
  }
};

export const updatePricing = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { Starter, Free, Pro, Premium } = req.body;
    const starterPlan = Starter || Free;
    if (!starterPlan || !Pro || !Premium) {
      res.status(400).json({ message: 'Plans (Starter, Pro, Premium) are required.' });
      return;
    }

    const parseNum = (val: any, fallback: number) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0 ? num : fallback;
    };

    const settings = loadSettings();
    settings.subscriptionPricing = {
      Starter: {
        monthly: parseNum(starterPlan.monthly, 2.99),
        annual: parseNum(starterPlan.annual, 29.99),
        currency: starterPlan.currency || 'USD'
      },
      Pro: {
        monthly: parseNum(Pro.monthly, 4.99),
        annual: parseNum(Pro.annual, 49.99),
        threeMonths: parseNum(Pro.threeMonths, 12.99),
        sixMonths: parseNum(Pro.sixMonths, 24.99),
        currency: Pro.currency || 'USD'
      },
      Premium: {
        monthly: parseNum(Premium.monthly, 9.99),
        annual: parseNum(Premium.annual, 99.99),
        threeMonths: parseNum(Premium.threeMonths, 26.99),
        sixMonths: parseNum(Premium.sixMonths, 49.99),
        currency: Premium.currency || 'USD'
      }
    };
    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = (req as any).user?.id || 'admin';
    saveSettings(settings);

    res.json({ message: 'Pricing updated successfully.', pricing: settings.subscriptionPricing });
  } catch (error) {
    console.error('Update Pricing Error:', error);
    res.status(500).json({ message: 'Failed to update pricing' });
  }
};

