import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { requireAdmin } from '../middlewares/adminMiddleware';
import {
  getOverview,
  getUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  getAccounts,
  getAccountById,
  updateAccountStatus,
  getIssues,
  updateIssue,
  getSystemErrors,
  resolveSystemError,
  resolveAllSystemErrors,
  getSubscriptions,
  updateSubscription,
  getPayouts,
  approvePayout,
  rejectPayout,
  getReports,
  getActivityLogs,
  getPricing,
  updatePricing
} from '../controllers/adminController';
import {
  sendEmailNotification,
  getEmailNotificationLogs,
  getEmailRecipients
} from '../controllers/emailNotificationController';

const router = express.Router();

// Apply protect and requireAdmin to all admin endpoints
router.use(protect);
router.use(requireAdmin);

// Overview
router.get('/overview', getOverview);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/unsuspend', unsuspendUser);

// Account Management
router.get('/accounts', getAccounts);
router.get('/accounts/:id', getAccountById);
router.put('/accounts/:id/status', updateAccountStatus);

// Issues / Support Management
router.get('/issues', getIssues);
router.put('/issues/:id', updateIssue);

// System Errors
router.get('/errors', getSystemErrors);
router.put('/errors/resolve-all', resolveAllSystemErrors);
router.put('/errors/:id/resolve', resolveSystemError);

// Subscriptions
router.get('/subscriptions', getSubscriptions);
router.put('/subscriptions/:userId', updateSubscription);

// Payouts
router.get('/payouts', getPayouts);
router.put('/payouts/:id/approve', approvePayout);
router.put('/payouts/:id/reject', rejectPayout);

// Reports
router.get('/reports', getReports);

// Admin Activity Log
router.get('/activity', getActivityLogs);

// Subscription Pricing Settings
router.get('/settings/pricing', getPricing);
router.put('/settings/pricing', updatePricing);

// Email Notifications
router.post('/email/send', sendEmailNotification);
router.get('/email/logs', getEmailNotificationLogs);
router.get('/email/recipients', getEmailRecipients);

export default router;
