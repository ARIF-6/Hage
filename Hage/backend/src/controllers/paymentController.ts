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
const PLAN_MONTHS: Record<string, number> = {
  oneMonth:    1,
  threeMonths: 3,
  sixMonths:   6,
};

const PLAN_TIER: Record<string, string> = {
  oneMonth:    'Starter',
  threeMonths: 'Pro',
  sixMonths:   'Premium',
};

const PLAN_LABEL: Record<string, string> = {
  oneMonth:    'Starter (1 Month)',
  threeMonths: 'Pro (3 Months)',
  sixMonths:   'Premium (6 Months)',
};

// ─── Load current plan pricing from settings.json ─────────────────────────────
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

function getPlanPrice(planKey: string): number {
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

// In-memory pending payments map (paymentId → order info)
const pendingPayments = new Map<string, {
  userId: string;
  planKey: string;
  amount: number;
  userWalletAddress?: string;
  status?: string;
  createdAt: string;
}>();

// Helper: fetch from NOWPayments API
async function nowFetch(path: string, options: RequestInit = {}) {
  const url = `${getNowApiBase()}${path}`;
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
    throw new Error(data?.message || `NOWPayments error: ${res.status}`);
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/create
// Authenticated user — creates a USDT BEP20 payment invoice
// ─────────────────────────────────────────────────────────────────────────────
export const createPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planKey, userWalletAddress } = req.body;

    if (!planKey || !PLAN_MONTHS[planKey]) {
      res.status(400).json({ message: 'Invalid plan. Must be oneMonth, threeMonths, or sixMonths.' });
      return;
    }

    const userId   = req.user?._id || req.user?.id || 'unknown';
    const amount   = getPlanPrice(planKey);
    const orderId  = `hage_${userId}_${planKey}_${Date.now()}`;
    const backendUrl  = process.env.BACKEND_URL  || 'http://localhost:5000';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const apiKey = config.nowPaymentsApiKey;
    const hasRealApiKey = Boolean(apiKey && apiKey !== 'YOUR_NOWPAYMENTS_API_KEY_HERE' && apiKey.trim().length > 10);

    let invoice: any;

    if (!hasRealApiKey) {
      console.log(`[PAYMENT] Sandbox/Demo mode: creating mock invoice for user ${userId}, wallet: ${userWalletAddress}`);
      invoice = {
        payment_id: `mock_${Date.now()}`,
        pay_address: '0x71C94623dA4f16B2771d9d96859599547d86B00f', // Standard BSC deposit address
        pay_amount: amount,
        pay_currency: 'usdtbsc',
        actually_paid: 0,
        payment_status: 'waiting',
        expiration_estimate_date: new Date(Date.now() + 3600000).toISOString(),
      };
    } else {
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

      console.log(`[PAYMENT] Creating live invoice for user ${userId}, plan: ${planKey}, amount: $${amount}, wallet: ${userWalletAddress}`);

      invoice = await nowFetch('/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const paymentId = String(invoice.payment_id);

    // Store pending record in memory for quick lookup during polling
    pendingPayments.set(paymentId, {
      userId: String(userId),
      planKey,
      amount,
      userWalletAddress: userWalletAddress || '',
      status: invoice.payment_status || 'waiting',
      createdAt: new Date().toISOString(),
    });

    // Also persist a pending payment record to the store for durability
    const store = dbManager.getStore();
    store.subscriptions = store.subscriptions.filter(
      (s: any) => !(s.user === String(userId) && s.status === 'Pending')
    );
    store.subscriptions.push({
      _id: `pay_${paymentId}`,
      user: String(userId),
      userWalletAddress: userWalletAddress || '',
      plan: PLAN_LABEL[planKey],
      duration: planKey,
      status: 'Pending',
      paymentMethod: 'Crypto',
      nowPaymentId: paymentId,
      nowOrderId: orderId,
      amount,
      startDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    dbManager.saveToDisk();

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
      isMock: !hasRealApiKey,
    });
  } catch (err: any) {
    console.error('[PAYMENT] createPayment error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to create payment invoice.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/status/:paymentId
// Authenticated user — polls payment status
// ─────────────────────────────────────────────────────────────────────────────
export const getPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      res.status(400).json({ message: 'paymentId is required.' });
      return;
    }

    // Handle mock payment verification
    if (String(paymentId).startsWith('mock_')) {
      const pending = pendingPayments.get(String(paymentId));
      const store = dbManager.getStore();
      const rec = store.subscriptions.find((s: any) => s.nowPaymentId === String(paymentId));
      const currentStatus = rec?.status === 'Active' ? 'finished' : (pending?.status || 'waiting');
      
      res.json({
        paymentId,
        paymentStatus: currentStatus,
        payAddress: '0x71C94623dA4f16B2771d9d96859599547d86B00f',
        payAmount: pending?.amount || 4.99,
        payCurrency: 'usdtbsc',
        actuallyPaid: currentStatus === 'finished' ? (pending?.amount || 4.99) : 0,
        orderId: `hage_mock_${paymentId}`,
        isMock: true,
      });
      return;
    }

    const apiKey = config.nowPaymentsApiKey;
    const hasRealApiKey = Boolean(apiKey && apiKey !== 'YOUR_NOWPAYMENTS_API_KEY_HERE' && apiKey.trim().length > 10);
    if (!hasRealApiKey) {
      res.status(503).json({ message: 'Payment gateway not configured.' });
      return;
    }

    const data = await nowFetch(`/payment/${paymentId}`);

    // If payment just confirmed and we haven't processed it yet, activate now
    const isConfirmed = data.payment_status === 'finished' || data.payment_status === 'confirmed';
    if (isConfirmed) {
      const pending = pendingPayments.get(String(paymentId));
      if (pending) {
        await activateSubscription(pending.userId, pending.planKey, String(paymentId), data.order_id, pending.amount);
        pendingPayments.delete(String(paymentId));
      } else {
        // Try to find from store
        const store = dbManager.getStore();
        const rec = store.subscriptions.find(
          (s: any) => s.nowPaymentId === String(paymentId) && s.status === 'Pending'
        );
        if (rec) {
          await activateSubscription(rec.user, rec.duration, String(paymentId), rec.nowOrderId, rec.amount);
        }
      }
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
// For testing / demo: confirms a payment and immediately activates subscription
// ─────────────────────────────────────────────────────────────────────────────
export const simulatePaymentSuccess = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?._id || req.user?.id || 'unknown';

    const pending = pendingPayments.get(String(paymentId));
    const store = dbManager.getStore();
    const rec = store.subscriptions.find((s: any) => s.nowPaymentId === String(paymentId));
    
    const planKey = pending?.planKey || rec?.duration || 'threeMonths';
    const amount = pending?.amount || rec?.amount || 4.99;

    await activateSubscription(String(userId), planKey, String(paymentId), `order_${paymentId}`, amount);

    if (pending) {
      pending.status = 'finished';
    }

    res.json({
      success: true,
      message: 'Payment verified and plan activated!',
      planKey,
      paymentId,
    });
  } catch (err: any) {
    console.error('[PAYMENT] simulatePaymentSuccess error:', err.message);
    res.status(500).json({ message: err.message || 'Failed to simulate payment.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/ipn
// NOWPayments IPN webhook — NO JWT auth, verified via HMAC-SHA512
// ─────────────────────────────────────────────────────────────────────────────
export const handleIpn = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Verify HMAC-SHA512 signature
    const receivedSig = req.headers['x-nowpayments-sig'] as string;
    const ipnSecret   = config.nowPaymentsIpnSecret;

    if (!ipnSecret || ipnSecret === 'YOUR_NOWPAYMENTS_IPN_SECRET_HERE') {
      // IPN secret not configured — log warning and accept (dev mode)
      console.warn('[IPN] WARNING: IPN secret not configured. Skipping signature verification.');
    } else if (!receivedSig) {
      console.warn('[IPN] Missing x-nowpayments-sig header — rejecting.');
      res.status(400).json({ message: 'Missing IPN signature.' });
      return;
    } else {
      // Sort keys alphabetically and compute HMAC
      const body = req.body as Record<string, any>;
      const sortedBody = Object.keys(body)
        .sort()
        .reduce((acc: Record<string, any>, key) => { acc[key] = body[key]; return acc; }, {});

      const expectedSig = crypto
        .createHmac('sha512', ipnSecret)
        .update(JSON.stringify(sortedBody))
        .digest('hex');

      if (expectedSig !== receivedSig) {
        console.warn('[IPN] Signature mismatch — rejecting IPN.');
        res.status(401).json({ message: 'Invalid IPN signature.' });
        return;
      }
    }

    const { payment_id, payment_status, order_id, price_amount } = req.body;

    console.log(`[IPN] Received: payment_id=${payment_id}, status=${payment_status}, order=${order_id}`);

    // 2. Only process terminal success states
    if (payment_status !== 'finished' && payment_status !== 'confirmed') {
      // Acknowledge intermediate states (waiting, confirming, etc.)
      res.status(200).json({ received: true, status: payment_status });
      return;
    }

    // 3. Parse order_id to find user and plan
    // Format: hage_{userId}_{planKey}_{timestamp}
    const parts = String(order_id).split('_');
    if (parts.length < 4 || parts[0] !== 'hage') {
      console.warn('[IPN] Could not parse order_id:', order_id);
      res.status(200).json({ received: true }); // Still 200 to stop retries
      return;
    }

    const userId  = parts[1];
    const planKey = parts[2];

    // 4. Idempotency — check if already activated
    const store = dbManager.getStore();
    const existing = store.subscriptions.find(
      (s: any) => s.nowPaymentId === String(payment_id) && s.status === 'Active'
    );
    if (existing) {
      console.log(`[IPN] Payment ${payment_id} already activated — skipping.`);
      res.status(200).json({ received: true, alreadyProcessed: true });
      return;
    }

    // 5. Activate subscription
    await activateSubscription(userId, planKey, String(payment_id), String(order_id), Number(price_amount));

    pendingPayments.delete(String(payment_id));

    res.status(200).json({ received: true, activated: true });
  } catch (err: any) {
    console.error('[IPN] Error:', err.message);
    // Always return 200 to prevent NOWPayments from hammering with retries
    res.status(200).json({ received: true, error: 'Internal processing error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/my-subscription
// Authenticated — returns the caller's current subscription record
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
async function activateSubscription(
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

  // Remove any existing pending or free subscriptions for this user
  store.subscriptions = store.subscriptions.filter(
    (s: any) => s.user !== userId || (s.status === 'Active' && s.nowPaymentId && s.nowPaymentId !== paymentId)
  );

  // Add the activated subscription record
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

  // Update user record with subscription info
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

  // Also update Mongo if connected
  try {
    const Subscription = (await import('../models/Subscription')).default;
    const User         = (await import('../models/User')).default;

    if (dbManager.getIsMongoConnected()) {
      await Subscription.findOneAndUpdate(
        { user: userId },
        {
          user: userId,
          plan: tier as any,
          status: 'Active',
          paymentMethod: 'Crypto' as any,
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
