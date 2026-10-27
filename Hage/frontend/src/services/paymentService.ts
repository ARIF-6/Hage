/**
 * paymentService.ts
 *
 * All NOWPayments interactions go through this service -> backend -> NOWPayments.
 * API keys are NEVER used in frontend code.
 */
import axios from 'axios';

const API_BASE  = 'http://localhost:5000/api/payments';
const AUTH_BASE = 'http://localhost:5000/api/auth';

export interface CreatePaymentResponse {
  paymentId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  payNetwork: string;
  usdAmount: number;
  planKey: string;
  planLabel: string;
  expirationEstimate?: string;
  paymentStatus: string;
}

export interface PaymentStatusResponse {
  paymentId: string;
  paymentStatus: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  actuallyPaid: number;
  orderId: string;
}

export interface MySubscriptionResponse {
  plan: string;
  planKey: string | null;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  endDate: string | null;
  startDate: string | null;
  amount: number | null;
  paymentMethod: string | null;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createPayment(
  planKey: 'oneMonth' | 'threeMonths' | 'sixMonths',
  token: string,
  userWalletAddress?: string
): Promise<CreatePaymentResponse> {
  const res = await axios.post(
    `${API_BASE}/create`,
    { planKey, userWalletAddress },
    { headers: authHeaders(token) }
  );
  return res.data;
}

export async function fetchPaymentStatus(
  paymentId: string,
  token: string
): Promise<PaymentStatusResponse> {
  const res = await axios.get(
    `${API_BASE}/status/${paymentId}`,
    { headers: authHeaders(token) }
  );
  return res.data;
}

export async function simulatePaymentSuccess(
  paymentId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(
    `${API_BASE}/simulate-success/${paymentId}`,
    {},
    { headers: authHeaders(token) }
  );
  return res.data;
}

export async function fetchMySubscription(token: string): Promise<MySubscriptionResponse> {
  const res = await axios.get(`${API_BASE}/my-subscription`, { headers: authHeaders(token) });
  return res.data;
}

export async function refreshSubscriptionFromBackend(token: string): Promise<boolean> {
  try {
    const res  = await axios.get(`${AUTH_BASE}/me`, { headers: authHeaders(token) });
    const data = res.data;

    const plan          = data.subscriptionPlan    || 'None';
    const status        = data.subscriptionStatus  || 'Pending Payment';
    const expiry        = data.subscriptionExpiry  || null;
    const planKey       = data.subscriptionPlanKey || null;
    const paymentMethod = data.paymentMethod       || '';

    const isPaidPlan     = plan === 'Starter' || plan === 'Pro' || plan === 'Premium';
    const isAdminGranted = paymentMethod === 'Manual Admin' || paymentMethod === 'Active Access';

    localStorage.setItem('profile_plan', plan);
    localStorage.setItem('user_subscription_status', status);
    localStorage.setItem('profile_status', status);
    localStorage.setItem('profile_paymentMethod', paymentMethod);

    if (status === 'Active' && (isPaidPlan || isAdminGranted)) {
      const tier = isPaidPlan ? plan : 'Free';
      localStorage.setItem('hage_user_subscription_tier', tier);
      localStorage.removeItem('hage_subscription_expired');

      const durationLabel: Record<string, string> = {
        oneMonth:    'Starter (1 Month)',
        threeMonths: 'Pro (3 Months)',
        sixMonths:   'Premium (6 Months)',
      };
      const monthsMap: Record<string, number> = { oneMonth: 1, threeMonths: 3, sixMonths: 6 };

      const computedExpiry = expiry
        ? expiry
        : planKey
          ? new Date(Date.now() + (monthsMap[planKey] || 1) * 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const statusPayload = {
        active:        true,
        status:        'Active',
        plan:          planKey ? durationLabel[planKey] : (isPaidPlan ? durationLabel[planKey || 'oneMonth'] : plan),
        duration:      planKey || (plan === 'Premium' ? 'sixMonths' : plan === 'Pro' ? 'threeMonths' : 'oneMonth'),
        price:         null,
        expiry:        computedExpiry,
        subscribedAt:  new Date().toISOString(),
        paymentMethod: paymentMethod || 'Crypto (USDT BEP20)',
      };
      localStorage.setItem('hage_subscription_status', JSON.stringify(statusPayload));
    } else {
      localStorage.setItem('hage_user_subscription_tier', 'None');
      localStorage.removeItem('hage_subscription_status');
    }

    window.dispatchEvent(new CustomEvent('subscriptionStatusChanged'));
    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: isPaidPlan ? plan : 'Free' } }));

    return true;
  } catch (err) {
    console.warn('[paymentService] refreshSubscriptionFromBackend failed:', err);
    return false;
  }
}

export async function pollUntilSettled(
  paymentId: string,
  token: string,
  onStatus: (status: PaymentStatusResponse) => void,
  intervalMs = 10000,
  maxAttempts = 72
): Promise<string> {
  let attempts = 0;

  return new Promise((resolve) => {
    const timer = setInterval(async () => {
      try {
        const status = await fetchPaymentStatus(paymentId, token);
        onStatus(status);

        const terminal = ['finished', 'confirmed', 'failed', 'refunded', 'expired'];
        if (terminal.includes(status.paymentStatus) || ++attempts >= maxAttempts) {
          clearInterval(timer);
          resolve(status.paymentStatus);
        }
      } catch (err) {
        console.warn('[paymentService] Poll error:', err);
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(timer);
          resolve('unknown');
        }
      }
    }, intervalMs);
  });
}

export function isPaymentSuccess(status: string): boolean {
  return status === 'finished' || status === 'confirmed';
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    waiting:        'Waiting for payment...',
    confirming:     'Transaction detected - confirming on chain...',
    confirmed:      'Confirmed! Activating your plan...',
    sending:        'Processing...',
    partially_paid: 'Partial payment received - please send the remaining amount.',
    finished:       'Payment complete!',
    failed:         'Payment failed.',
    refunded:       'Payment refunded.',
    expired:        'Payment window expired.',
    unknown:        'Status unknown - please contact support.',
  };
  return labels[status] || `Status: ${status}`;
}
