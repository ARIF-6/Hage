import { Request, Response } from 'express';
import crypto from 'crypto';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dbManager } from '../config/dbManager';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

// ─── NOWPayments API base URL ─────────────────────────────────────────────────
function getNowApiBase(): string {
  return config.nowPaymentsSandbox
    ? 'https://api-sandbox.nowpayments.io/v1'
    : 'https://api.nowpayments.io/v1';
}

// ─── Plan duration map (months) ───────────────────────────────────────────────
export const PLAN_MONTHS: Record<string, number> = {
  oneMonth:    1,
  threeMonths: 3,
  sixMonths:   6,
};

export const PLAN_TIER: Record<string, string> = {
  oneMonth:    'Starter',
  threeMonths: 'Pro',
  sixMonths:   'Premium',
};

export const PLAN_LABEL: Record<string, string> = {
  oneMonth:    'Starter (1 Month)',
  threeMonths: 'Pro (3 Months)',
  sixMonths:   'Premium (6 Months)',
};

// ─── Load current plan pricing from settings.json ─────────────────────────────
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

export function getPlanPrice(planKey: string): number {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      const p = settings?.subscriptionPricing;
      if (planKey === 'oneMonth')    return Number(p?.Starter?.monthly) || 2.99;
      if (planKey === 'threeMonths') return Number(p?.Pro?.monthly)     || 4.99;
      if (planKey === 'sixMonths')   return Number(p?.Premium?.monthly) || 9.99;
    }
  } catch (_) {}
  // Hard fallback
  if (planKey === 'oneMonth')    return 2.99;
  if (planKey === 'threeMonths') return 4.99;
  if (planKey === 'sixMonths')   return 9.99;
  return 4.99;
}

// In-memory pending payments map (paymentId → order info) for rapid cache
export const pendingPayments = new Map<string, {
  userId: string;
  planKey: string;
  amount: number;
  userWalletAddress?: string;
  status?: string;
  createdAt: string;
}>();

// In-flight concurrency set to prevent duplicate concurrent webhook executions
export const processingPayments = new Set<string>();

// ─── Helpers: Signature calculation & recursive key sorting ─────────────────
export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj)
    .sort()
    .reduce((acc: Record<string, any>, key: string) => {
      acc[key] = sortObjectKeys(obj[key]);
      return acc;
    }, {});
}

export function calculateIpnSignature(payload: any, secret: string): string {
  const sorted = sortObjectKeys(payload);
  return crypto
    .createHmac('sha512', secret.trim())
    .update(JSON.stringify(sorted))
    .digest('hex');
}

// Helper: fetch from NOWPayments API
async function nowFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${getNowApiBase()}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': config.nowPaymentsApiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(data?.message || `NOWPayments API error: ${res.status}`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create
// Authenticated user — creates a live USDT BEP20 payment invoice via NOWPayments
// ─────────────────────────────────────────────────────────────────────────────
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planKey, userWalletAddress } = req.body;

    if (!planKey || !PLAN_MONTHS[planKey]) {
      res.status(400).json({ message: 'Invalid plan. Must be oneMonth, threeMonths, or sixMonths.' });
      return;
    }

    const apiKey = config.nowPaymentsApiKey;
    const hasRealApiKey = Boolean(apiKey && apiKey !== 'YOUR_NOWPAYMENTS_API_KEY_HERE' && apiKey.trim().length > 10);

    if (!hasRealApiKey) {
      res.status(503).json({
        message: 'Payment gateway not configured. Please provide a valid NOWPAYMENTS_API_KEY in the backend environment.',
      });
      return;
    }

    const userId   = String(req.user?._id || req.user?.id || 'unknown');
    const amount   = getPlanPrice(planKey);
    const orderId  = `hage_${userId}_${planKey}_${Date.now()}`;
    const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const payload = {
      price_amount:      amount,
      price_currency:    'usd',
      pay_currency:      'usdtbsc',       // USDT on BNB Smart Chain (BEP20)
      order_id:          orderId,
      order_description: `HAGE Trading Journal — ${PLAN_LABEL[planKey]}`,
      ipn_callback_url:  `${backendUrl}/api/payments/ipn`,
      success_url:       `${frontendUrl}/dashboard/subscription?payment=success`,
      cancel_url:        `${frontendUrl}/dashboard/subscription?payment=cancelled`,
    };

    console.log(`[PAYMENT] Creating live invoice for user ${userId}, plan: ${planKey}, amount: $${amount}, wallet: ${userWalletAddress || 'N/A'}`);

    const invoice = await nowFetch('/payment', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const paymentId = String(invoice.payment_id);

    // Store pending record in memory for quick status lookup
    pendingPayments.set(paymentId, {
      userId,
      planKey,
      amount,
      userWalletAddress: userWalletAddress || '',
      status: invoice.payment_status || 'waiting',
      createdAt: new Date().toISOString(),
    });

    // Persist pending payment record to database store
    const store = dbManager.getStore();
    store.subscriptions = store.subscriptions.filter(
      (s: any) => !(s.user === userId && s.status === 'Pending')
    );

    const pendingRecord = {
      _id: `pay_${paymentId}`,
      user: userId,
      userWalletAddress: userWalletAddress || '',
      plan: PLAN_LABEL[planKey],
      duration: planKey,
      tier: PLAN_TIER[planKey],
      status: 'Pending',
      paymentMethod: 'Crypto',
      nowPaymentId: paymentId,
      nowOrderId: orderId,
      amount,
      priceCurrency: 'usd',
      payCurrency: invoice.pay_currency || 'usdtbsc',
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.subscriptions.push(pendingRecord);
    dbManager.saveToDisk();

    // Also persist pending subscription to MongoDB if connected
    if (dbManager.getIsMongoConnected()) {
      try {
        const Subscription = (await import('../models/Subscription')).default;
        await Subscription.findOneAndUpdate(
          { nowPaymentId: paymentId },
          {
            user: userId,
            plan: (PLAN_TIER[planKey] as any) || 'Starter',
            status: 'Pending',
            paymentMethod: 'Crypto',
            nowPaymentId: paymentId,
            nowOrderId: orderId,
            amount,
            duration: planKey,
            priceCurrency: 'usd',
            payCurrency: invoice.pay_currency || 'usdtbsc',
            userWalletAddress: userWalletAddress || '',
            startDate: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (mongoErr) {
        console.warn('[PAYMENT] Mongo pending record sync warning:', mongoErr);
      }
    }

    res.json({
      paymentId,
      payAddress:    invoice.pay_address,
      payAmount:     invoice.pay_amount,
      payCurrency:   invoice.pay_currency,      // 'usdtbsc'
      payNetwork:    'BNB Smart Chain (BEP20)',
      actuallyPaid:  invoice.actually_paid,
      paymentStatus: invoice.payment_status,
      expirationEstimate: invoice.expiration_estimate_date,
      orderId,
      planKey,
      planLabel: PLAN_LABEL[planKey],
      usdAmount: amount,
      userWalletAddress: userWalletAddress || '',
    });
  } catch (err: any) {
    console.error('[PAYMENT] createPayment error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to create payment invoice.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/status/:paymentId
// Authenticated user — polls live payment status from NOWPayments
// ─────────────────────────────────────────────────────────────────────────────
export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      res.status(400).json({ message: 'paymentId is required.' });
      return;
    }

    const apiKey = config.nowPaymentsApiKey;
    const hasRealApiKey = Boolean(apiKey && apiKey !== 'YOUR_NOWPAYMENTS_API_KEY_HERE' && apiKey.trim().length > 10);
    if (!hasRealApiKey) {
      res.status(503).json({ message: 'Payment gateway not configured.' });
      return;
    }

    const data = await nowFetch(`/payment/${paymentId}`);

    // Update status in pending memory and DB record
    const paymentKey = String(paymentId);
    const pending = pendingPayments.get(paymentKey);
    if (pending) {
      pending.status = data.payment_status;
    }

    const store = dbManager.getStore();
    const dbRec = store.subscriptions.find((s: any) => String(s.nowPaymentId) === paymentKey);
    if (dbRec && dbRec.status !== 'Active') {
      dbRec.paymentStatus = data.payment_status;
      dbRec.actuallyPaid = data.actually_paid;
      dbRec.updatedAt = new Date().toISOString();
      dbManager.saveToDisk();
    }

    // Requirement 4: Activate subscriptions ONLY after a verified payment reaches finished status
    if (data.payment_status === 'finished' && dbRec && dbRec.status !== 'Active') {
      const planKey = dbRec.duration || pending?.planKey || 'oneMonth';
      const amount = dbRec.amount || pending?.amount || getPlanPrice(planKey);
      await activateSubscription(dbRec.user, planKey, paymentKey, dbRec.nowOrderId || data.order_id, amount);
      pendingPayments.delete(paymentKey);
    }

    res.json({
      paymentId:     data.payment_id,
      paymentStatus: data.payment_status,
      payAddress:    data.pay_address,
      payAmount:     data.pay_amount,
      payCurrency:   data.pay_currency,
      actuallyPaid:  data.actually_paid,
      orderId:       data.order_id,
    });
  } catch (err: any) {
    console.error('[PAYMENT] getPaymentStatus error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to fetch payment status.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/simulate-success/:paymentId
// Disabled in production / live mode: fake payment confirmations are forbidden
// ─────────────────────────────────────────────────────────────────────────────
export const simulatePaymentSuccess = async (req: AuthRequest, res: Response): Promise<void> => {
  res.status(403).json({
    success: false,
    message: 'Simulated payment confirmations are disabled. Payment activation requires verified IPN webhook confirmation.',
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/ipn
// NOWPayments IPN webhook — NO JWT auth, verified strictly via HMAC-SHA512
// ─────────────────────────────────────────────────────────────────────────────
export const handleIpn = async (req: Request, res: Response): Promise<void> => {
  let paymentKey: string | null = null;

  try {
    // 1. Verify HMAC-SHA512 Secret Configuration
    const ipnSecret = config.nowPaymentsIpnSecret;
    if (!ipnSecret || ipnSecret.trim() === '' || ipnSecret === 'YOUR_NOWPAYMENTS_IPN_SECRET_HERE') {
      console.error('[IPN] Webhook rejected: NOWPAYMENTS_IPN_SECRET is not configured on the server.');
      res.status(503).json({ error: 'NOWPayments IPN secret is not configured on the server.' });
      return;
    }

    // 2. Verify signature header existence
    const receivedSig = req.headers['x-nowpayments-sig'] as string | undefined;
    if (!receivedSig || typeof receivedSig !== 'string' || !receivedSig.trim()) {
      console.warn('[IPN] Webhook rejected: Missing x-nowpayments-sig header.');
      res.status(400).json({ error: 'Missing x-nowpayments-sig header.' });
      return;
    }

    // 3. Verify HMAC-SHA512 signature using constant-time comparison
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (_) {}
    }

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid JSON payload received.' });
      return;
    }

    const calculatedSig = calculateIpnSignature(payload, ipnSecret);
    const receivedBuffer = Buffer.from(receivedSig.trim().toLowerCase(), 'hex');
    const calculatedBuffer = Buffer.from(calculatedSig.toLowerCase(), 'hex');

    if (
      receivedBuffer.length !== calculatedBuffer.length ||
      receivedBuffer.length === 0 ||
      !crypto.timingSafeEqual(receivedBuffer, calculatedBuffer)
    ) {
      console.warn('[IPN] Webhook rejected: Invalid HMAC-SHA512 signature.');
      res.status(401).json({ error: 'Invalid IPN signature.' });
      return;
    }

    // 4. Extract and validate required payload fields
    const {
      payment_id,
      payment_status,
      order_id,
      price_amount,
      price_currency,
      pay_currency,
      actually_paid,
    } = payload;

    if (!payment_id || !order_id) {
      console.warn('[IPN] Missing payment_id or order_id in IPN payload.');
      res.status(400).json({ error: 'Missing required payment_id or order_id in IPN payload.' });
      return;
    }

    paymentKey = String(payment_id);

    // 5. Concurrency lock to prevent duplicate concurrent processing
    if (processingPayments.has(paymentKey)) {
      console.log(`[IPN] Payment ${paymentKey} is already being processed concurrently. Acknowledging.`);
      res.status(200).json({ received: true, inProgress: true, message: 'Webhook currently being processed.' });
      return;
    }
    processingPayments.add(paymentKey);

    console.log(`[IPN] Processing webhook for payment_id=${paymentKey}, status=${payment_status}, order_id=${order_id}`);

    // 6. Verify against database records (Requirement 3)
    const store = dbManager.getStore();
    let dbRecord = store.subscriptions.find(
      (s: any) => String(s.nowPaymentId) === paymentKey || String(s.nowOrderId) === String(order_id)
    );

    // Check Mongo if connected
    if (!dbRecord && dbManager.getIsMongoConnected()) {
      try {
        const Subscription = (await import('../models/Subscription')).default;
        const mongoSub = await Subscription.findOne({
          $or: [{ nowPaymentId: paymentKey }, { nowOrderId: String(order_id) }]
        });
        if (mongoSub) {
          dbRecord = mongoSub.toObject();
        }
      } catch (mongoErr) {
        console.warn('[IPN] Mongo lookup warning:', mongoErr);
      }
    }

    if (!dbRecord) {
      console.error(`[IPN] Database Verification Failed: No matching record found for payment_id: ${paymentKey}, order_id: ${order_id}`);
      res.status(404).json({ error: 'Payment record not found in database.' });
      return;
    }

    // 6a. Verify payment ID
    if (dbRecord.nowPaymentId && String(dbRecord.nowPaymentId) !== paymentKey) {
      console.error(`[IPN] Payment ID mismatch: DB has ${dbRecord.nowPaymentId}, IPN has ${paymentKey}`);
      res.status(400).json({ error: 'Payment ID mismatch against database record.' });
      return;
    }

    // 6b. Verify order ID
    if (dbRecord.nowOrderId && String(dbRecord.nowOrderId) !== String(order_id)) {
      console.error(`[IPN] Order ID mismatch: DB has ${dbRecord.nowOrderId}, IPN has ${order_id}`);
      res.status(400).json({ error: 'Order ID mismatch against database record.' });
      return;
    }

    // 6c. Parse order_id format (hage_{userId}_{planKey}_{timestamp})
    const orderParts = String(order_id).split('_');
    if (orderParts.length < 4 || orderParts[0] !== 'hage') {
      console.error(`[IPN] Invalid order_id format: ${order_id}`);
      res.status(400).json({ error: 'Invalid order ID format.' });
      return;
    }

    const planKey = orderParts[orderParts.length - 2];
    const userId  = orderParts.slice(1, orderParts.length - 2).join('_');

    if (!PLAN_MONTHS[planKey]) {
      console.error(`[IPN] Unknown subscription planKey in order_id: ${planKey}`);
      res.status(400).json({ error: 'Unknown subscription plan in order ID.' });
      return;
    }

    // 6d. Verify subscription plan against database record
    if (dbRecord.duration && dbRecord.duration !== planKey) {
      console.error(`[IPN] Subscription plan mismatch: DB duration=${dbRecord.duration}, IPN planKey=${planKey}`);
      res.status(400).json({ error: 'Subscription plan does not match database record.' });
      return;
    }

    // 6e. Verify amount: price_amount against expected plan price in database
    const receivedAmount = Number(price_amount);
    const expectedAmount = Number(dbRecord.amount);
    if (isNaN(receivedAmount) || receivedAmount < (expectedAmount - 0.01)) {
      console.error(`[IPN] Amount mismatch: Expected at least $${expectedAmount}, received $${receivedAmount}`);
      res.status(400).json({ error: `Amount mismatch: expected at least $${expectedAmount}, received $${receivedAmount}` });
      return;
    }

    // 6f. Verify currency: price_currency must match expected currency (usd)
    const expectedCurrency = (dbRecord.priceCurrency || 'usd').toLowerCase();
    if (price_currency && String(price_currency).toLowerCase() !== expectedCurrency) {
      console.error(`[IPN] Currency mismatch: Expected ${expectedCurrency}, received ${price_currency}`);
      res.status(400).json({ error: `Currency mismatch: expected ${expectedCurrency}, received ${price_currency}` });
      return;
    }

    // 7. Prevent duplicate webhook processing (Requirement 5)
    if (dbRecord.status === 'Active') {
      console.log(`[IPN] Idempotency: Payment ${paymentKey} is already active. No duplicate processing needed.`);
      res.status(200).json({ received: true, alreadyProcessed: true, status: 'finished' });
      return;
    }

    // 8. Requirement 4: Activate subscriptions ONLY after verified payment reaches finished status
    if (payment_status !== 'finished') {
      console.log(`[IPN] Payment ${paymentKey} received with non-finished status: "${payment_status}". Updating status in database.`);
      
      // Update intermediate status in database for user tracking
      dbRecord.paymentStatus = payment_status;
      dbRecord.updatedAt = new Date().toISOString();
      dbManager.saveToDisk();

      res.status(200).json({
        received: true,
        status: payment_status,
        activated: false,
        message: `Status recorded as ${payment_status}. Subscription will activate when payment reaches 'finished'.`,
      });
      return;
    }

    // 9. Payment verified and reached finished status: Activate subscription!
    console.log(`[IPN] Payment ${paymentKey} VERIFIED and FINISHED! Activating subscription for user ${userId}, plan ${planKey}, amount $${expectedAmount}`);
    await activateSubscription(userId, planKey, paymentKey, String(order_id), expectedAmount);

    pendingPayments.delete(paymentKey);

    res.status(200).json({
      received: true,
      activated: true,
      status: 'finished',
      message: 'Payment verified and subscription activated successfully.',
    });
  } catch (err: any) {
    console.error('[IPN] Processing error:', err.message);
    res.status(500).json({ received: false, error: 'Internal webhook processing error' });
  } finally {
    if (paymentKey) {
      processingPayments.delete(paymentKey);
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/my-subscription
// Authenticated user — returns the caller's current subscription record
// ─────────────────────────────────────────────────────────────────────────────
export const getMySubscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId    = String(req.user?._id || req.user?.id || '');
    const userEmail = String(req.user?.email || '').toLowerCase();

    const store = dbManager.getStore();

    const subs = store.subscriptions.filter(
      (s: any) =>
        String(s.user) === userId ||
        (s.userEmail && s.userEmail.toLowerCase() === userEmail)
    );

    // Prefer Active paid crypto sub, then any active sub, then latest
    const activeSub =
      subs.find((s: any) => s.status === 'Active' && s.paymentMethod === 'Crypto') ||
      subs.find((s: any) => s.status === 'Active') ||
      subs[subs.length - 1];

    if (!activeSub) {
      res.json({ plan: 'None', status: 'Pending Payment', isActive: false, planKey: null, endDate: null });
      return;
    }

    // Determine tier from plan field or duration key
    const planKey   = activeSub.duration || activeSub.planKey || null;
    const tier      = activeSub.plan || 'None';
    const status    = activeSub.status || 'Pending Payment';
    const endDate   = activeSub.endDate || null;
    const isPaidPlan = tier === 'Starter' || tier === 'Pro' || tier === 'Premium';
    const isAdminGranted = activeSub.paymentMethod === 'Manual Admin' || activeSub.paymentMethod === 'Active Access';
    const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
    const isActive  = status === 'Active' && (isPaidPlan || isAdminGranted) && !isExpired;

    res.json({
      plan:      tier,
      planKey,
      status,
      isActive,
      isExpired,
      endDate,
      startDate: activeSub.startDate || null,
      amount:    activeSub.amount    || null,
      paymentMethod: activeSub.paymentMethod || null,
    });
  } catch (err: any) {
    console.error('[PAYMENT] getMySubscription error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to fetch subscription.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: activate a user's subscription in dbManager + Mongo
// ─────────────────────────────────────────────────────────────────────────────
export async function activateSubscription(
  userId: string,
  planKey: string,
  paymentId: string,
  orderId: string,
  amount: number
) {
  const months    = PLAN_MONTHS[planKey] || 1;
  const tier      = PLAN_TIER[planKey]   || 'Starter';
  const label     = PLAN_LABEL[planKey]  || 'Starter (1 Month)';
  const startDate = new Date();
  const endDate   = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + months);

  console.log(`[PAYMENT] Activating subscription: user=${userId}, plan=${label}, expires=${endDate.toISOString()}`);

  const store = dbManager.getStore();

  // Find existing pending record for this payment/user and update to Active
  const existingSub = store.subscriptions.find(
    (s: any) => String(s.nowPaymentId) === String(paymentId) || String(s.nowOrderId) === String(orderId)
  );

  if (existingSub) {
    existingSub.user = userId;
    existingSub.plan = tier;
    existingSub.planLabel = label;
    existingSub.duration = planKey;
    existingSub.status = 'Active';
    existingSub.paymentMethod = 'Crypto';
    existingSub.nowPaymentId = paymentId;
    existingSub.nowOrderId = orderId;
    existingSub.amount = amount;
    existingSub.startDate = startDate.toISOString();
    existingSub.endDate = endDate.toISOString();
    existingSub.updatedAt = startDate.toISOString();
  } else {
    // Remove previous non-active records for this user and insert new Active record
    store.subscriptions = store.subscriptions.filter(
      (s: any) => s.user !== userId || s.status === 'Active'
    );
    store.subscriptions.push({
      _id: `sub_${paymentId}`,
      user: userId,
      plan: tier,
      planLabel: label,
      duration: planKey,
      status: 'Active',
      paymentMethod: 'Crypto',
      nowPaymentId: paymentId,
      nowOrderId: orderId,
      amount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      createdAt: startDate.toISOString(),
      updatedAt: startDate.toISOString(),
    });
  }

  // Update user profile record with active subscription info
  const user = store.users.find((u: any) => String(u._id) === String(userId));
  if (user) {
    user.subscriptionTier      = tier;
    user.subscriptionPlan      = tier;
    user.subscriptionStatus    = 'Active';
    user.subscriptionExpiry    = endDate.toISOString();
    user.subscriptionPlanKey   = planKey;
    user.subscriptionPaymentId = paymentId;
    user.updatedAt             = startDate.toISOString();
  }

  dbManager.saveToDisk();

  // Also synchronize to MongoDB if connected
  try {
    if (dbManager.getIsMongoConnected()) {
      const Subscription = (await import('../models/Subscription')).default;
      const User         = (await import('../models/User')).default;

      await Subscription.findOneAndUpdate(
        { $or: [{ nowPaymentId: paymentId }, { user: userId }] },
        {
          user: userId,
          plan: tier as any,
          status: 'Active',
          paymentMethod: 'Crypto',
          nowPaymentId: paymentId,
          nowOrderId: orderId,
          amount,
          duration: planKey,
          priceCurrency: 'usd',
          payCurrency: 'usdtbsc',
          startDate,
          endDate,
        },
        { upsert: true, new: true }
      );
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: tier,
        subscriptionStatus: 'Active',
        subscriptionExpiry: endDate.toISOString(),
      });
    }
  } catch (e) {
    console.warn('[PAYMENT] Mongo subscription update warning:', e);
  }
}

