/**
 * Subscription Tier Rules & Limits Enforcement Store
 * 
 * Rules:
 *  - Free:
 *      * Max 1 Trading Account
 *      * Max 50 Trades / month
 *      * Basic Analytics only
 *      * Challenge Tracking locked (requires Pro)
 *  - Pro:
 *      * Up to 3 Trading Accounts
 *      * Unlimited Trades
 *      * Advanced Analytics unlocked
 *      * Challenge Tracking unlocked
 *  - Premium:
 *      * Unlimited Trading Accounts
 *      * Unlimited Trades
 *      * Advanced Analytics + AI Trade Analysis
 *      * Challenge Tracking unlocked
 *      * MT5 Integration
 */

export type PlanType = 'Free' | 'Starter' | 'Pro' | 'Premium';

export interface PlanRules {
  name: PlanType;
  maxAccounts: number;
  maxTradesPerMonth: number;
  hasChallengeTracking: boolean;
  hasAdvancedAnalytics: boolean;
  hasAiAnalysis: boolean;
  hasMt5Integration: boolean;
}

export const PLAN_RULES: Record<PlanType, PlanRules> = {
  Free: {
    name: 'Free',
    // Unpaid / new registrations: 0 accounts, all trading locked until fee is paid
    maxAccounts: 0,
    maxTradesPerMonth: 0,
    hasChallengeTracking: false,
    hasAdvancedAnalytics: false,
    hasAiAnalysis: false,
    hasMt5Integration: false,
  },
  Starter: {
    name: 'Starter',
    maxAccounts: 2,           // 1 Month allows up to 2 accounts
    maxTradesPerMonth: Infinity,
    hasChallengeTracking: true,
    hasAdvancedAnalytics: true,
    hasAiAnalysis: false,
    hasMt5Integration: false,
  },
  Pro: {
    name: 'Pro',
    maxAccounts: 10,          // 3 Months allows up to 10 accounts
    maxTradesPerMonth: Infinity,
    hasChallengeTracking: true,
    hasAdvancedAnalytics: true,
    hasAiAnalysis: false,
    hasMt5Integration: false,
  },
  Premium: {
    name: 'Premium',
    maxAccounts: Infinity,    // 6 Months allows unlimited accounts
    maxTradesPerMonth: Infinity,
    hasChallengeTracking: true,
    hasAdvancedAnalytics: true,
    hasAiAnalysis: true,
    hasMt5Integration: true,
  },
};

const PLAN_STORAGE_KEY = 'hage_user_subscription_tier';

export interface SubscriptionStatusInfo {
  isSubscribed: boolean;
  isActive: boolean;
  isExpired: boolean;
  isReadOnly: boolean;
  planName: string;
  planDuration?: string;
  expiryDate: string | null;
  daysRemaining: number;
}

export function getSubscriptionStatus(): SubscriptionStatusInfo {
  try {
    const userRole = localStorage.getItem('user_role') || '';
    if (userRole === 'admin') {
      return {
        isSubscribed: true,
        isActive: true,
        isExpired: false,
        isReadOnly: false,
        planName: 'Admin Access',
        expiryDate: null,
        daysRemaining: 999
      };
    }

    // 1. Check explicit test flag
    if (localStorage.getItem('hage_subscription_expired') === 'true') {
      return {
        isSubscribed: true,
        isActive: false,
        isExpired: true,
        isReadOnly: true,
        planName: 'Starter (1 Month)',
        planDuration: 'oneMonth',
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 0
      };
    }

    // 2. Check admin-set profile status
    const profileSubStatus = (localStorage.getItem('user_subscription_status') || localStorage.getItem('profile_status') || '').toLowerCase();
    const profilePlan = localStorage.getItem('profile_plan') || localStorage.getItem(PLAN_STORAGE_KEY) || 'None';
    const profileMethod = (localStorage.getItem('profile_paymentMethod') || '').toLowerCase();
    const isPaidTier = profilePlan === 'Starter' || profilePlan === 'Pro' || profilePlan === 'Premium';
    const isExplicitAdminGrant = profileMethod.includes('manual admin') || profileMethod.includes('active access');

    if (profileSubStatus === 'expired') {
      return {
        isSubscribed: true,
        isActive: false,
        isExpired: true,
        isReadOnly: true,
        planName: profilePlan,
        expiryDate: null,
        daysRemaining: 0
      };
    }

    if (profileSubStatus === 'active' && (isPaidTier || isExplicitAdminGrant)) {
      return {
        isSubscribed: true,
        isActive: true,
        isExpired: false,
        isReadOnly: false,
        planName: profilePlan,
        expiryDate: null,
        daysRemaining: 365
      };
    }

    // 3. Check saved subscription status payload
    const subRaw = localStorage.getItem('hage_subscription_status');
    if (subRaw) {
      const parsed = JSON.parse(subRaw);
      if (parsed) {
        const hasExpiry = Boolean(parsed.expiry);
        const expiryTime = hasExpiry ? new Date(parsed.expiry).getTime() : null;
        const now = Date.now();
        const isPast = expiryTime !== null && expiryTime <= now;
        const isMarkedExpired = parsed.status === 'Expired' || parsed.expired === true || parsed.active === false;

        // If expiry date has passed or status is explicitly expired
        if (isPast || (isMarkedExpired && hasExpiry)) {
          return {
            isSubscribed: true,
            isActive: false,
            isExpired: true,
            isReadOnly: true,
            planName: parsed.plan || 'Starter (1 Month)',
            planDuration: parsed.duration || 'oneMonth',
            expiryDate: parsed.expiry || null,
            daysRemaining: 0
          };
        }

        const planStr = (parsed.plan || '').toLowerCase();
        const durationStr = (parsed.duration || '').toLowerCase();
        const methodStr = (parsed.paymentMethod || '').toLowerCase();
        const isPaid =
          planStr.includes('starter') || planStr.includes('pro') || planStr.includes('premium') ||
          durationStr === 'onemonth' || durationStr === 'threemonths' || durationStr === 'sixmonths' ||
          methodStr.includes('crypto') || methodStr.includes('manual admin') || methodStr.includes('active access');

        if (parsed.active && isPaid && (!hasExpiry || (expiryTime && expiryTime > now))) {
          const days = expiryTime ? Math.max(1, Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24))) : 30;
          return {
            isSubscribed: true,
            isActive: true,
            isExpired: false,
            isReadOnly: false,
            planName: parsed.plan || 'Pro',
            planDuration: parsed.duration,
            expiryDate: parsed.expiry || null,
            daysRemaining: days
          };
        }
      }
    }
  } catch (_) {}

  return {
    isSubscribed: false,
    isActive: false,
    isExpired: false,
    isReadOnly: false,
    planName: 'None',
    expiryDate: null,
    daysRemaining: 0
  };
}

export function isSubscriptionExpired(): boolean {
  return getSubscriptionStatus().isExpired;
}

export function isDashboardReadOnly(): boolean {
  return getSubscriptionStatus().isReadOnly;
}

export function triggerReadOnlyAlert(actionName?: string): boolean {
  if (isDashboardReadOnly()) {
    window.dispatchEvent(new CustomEvent('subscriptionExpiredActionBlocked', {
      detail: { actionName: actionName || 'manage dashboard data' }
    }));
    return true;
  }
  return false;
}

export function setSubscriptionExpired(expired: boolean): void {
  try {
    if (expired) {
      localStorage.setItem('hage_subscription_expired', 'true');
      const subRaw = localStorage.getItem('hage_subscription_status');
      if (subRaw) {
        const parsed = JSON.parse(subRaw);
        parsed.active = false;
        parsed.status = 'Expired';
        parsed.expired = true;
        parsed.expiry = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
        localStorage.setItem('hage_subscription_status', JSON.stringify(parsed));
      } else {
        localStorage.setItem('hage_subscription_status', JSON.stringify({
          active: false,
          status: 'Expired',
          expired: true,
          plan: 'Starter (1 Month)',
          duration: 'oneMonth',
          expiry: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          subscribedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString()
        }));
      }
    } else {
      localStorage.removeItem('hage_subscription_expired');
      const subRaw = localStorage.getItem('hage_subscription_status');
      if (subRaw) {
        const parsed = JSON.parse(subRaw);
        parsed.active = true;
        parsed.status = 'Active';
        parsed.expired = false;
        parsed.expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
        localStorage.setItem('hage_subscription_status', JSON.stringify(parsed));
      }
    }
    window.dispatchEvent(new CustomEvent('subscriptionStatusChanged'));
    window.dispatchEvent(new CustomEvent('planUpdated'));
  } catch (_) {}
}

/**
 * Returns true if the user was explicitly granted access by an admin
 * (regardless of which plan tier was set).
 */
export function isAdminGrantedAccess(): boolean {
  try {
    if (localStorage.getItem('user_role') === 'admin') return true;

    const paymentMethod = (localStorage.getItem('profile_paymentMethod') || '').toLowerCase();
    if (paymentMethod.includes('manual admin') || paymentMethod.includes('active access')) return true;

    const subRaw = localStorage.getItem('hage_subscription_status');
    if (subRaw) {
      const parsed = JSON.parse(subRaw);
      const method = (parsed?.paymentMethod || '').toLowerCase();
      if (method.includes('manual admin') || method.includes('active access')) return true;
    }
  } catch (_) {}
  return false;
}

export function hasUserPurchasedPlan(): boolean {
  try {
    const role = localStorage.getItem('user_role') || '';
    if (role === 'admin') return true;

    // Simulation or explicit expired flag means they had a plan that expired (can enter in read-only mode)
    if (localStorage.getItem('hage_subscription_expired') === 'true') {
      return true;
    }

    // 1. Check saved subscription status payload (from Crypto payment or live backend sync)
    const subRaw = localStorage.getItem('hage_subscription_status');
    if (subRaw) {
      const parsed = JSON.parse(subRaw);
      if (parsed) {
        const plan = (parsed.plan || '').toLowerCase();
        const duration = (parsed.duration || '').toLowerCase();
        // ONLY genuine paid plans count as purchased
        const isPaidTier =
          plan.includes('starter') || plan.includes('pro') || plan.includes('premium') ||
          duration === 'onemonth' || duration === 'threemonths' || duration === 'sixmonths';

        const method = (parsed.paymentMethod || '').toLowerCase();
        const isGrantedMethod =
          method.includes('crypto') ||
          method.includes('manual admin') ||
          method.includes('active access');

        // Check if expiry date has passed
        const hasExpiry = Boolean(parsed.expiry);
        const expiryTime = hasExpiry ? new Date(parsed.expiry).getTime() : null;
        const isPastExpiry = expiryTime !== null && expiryTime <= Date.now();

        if (parsed.active && !isPastExpiry && isPaidTier && (isGrantedMethod || isPaidTier)) {
          return true;
        }
      }
    }

    // 2. Direct tier override in storage from backend sync
    const tier = localStorage.getItem(PLAN_STORAGE_KEY) || localStorage.getItem('profile_plan') || '';
    const status = (localStorage.getItem('user_subscription_status') || localStorage.getItem('profile_status') || '').toLowerCase();
    const paymentMethod = (localStorage.getItem('profile_paymentMethod') || '').toLowerCase();

    if (status === 'active') {
      // ONLY Starter, Pro, or Premium tiers count as purchased
      const isPaidTier = tier === 'Starter' || tier === 'Pro' || tier === 'Premium';
      const isGrantedMethod =
        paymentMethod.includes('manual admin') ||
        paymentMethod.includes('active access') ||
        paymentMethod.includes('crypto');

      if (isPaidTier && isGrantedMethod) {
        return true;
      }
    }
  } catch (_) {}
  return false;
}

export function getUserPlan(): PlanType {
  try {
    // If expired, drop to Free tier rules (or read only)
    if (isSubscriptionExpired()) {
      return 'Free';
    }

    // If admin explicitly granted this user access, give them full Premium rules
    // regardless of which plan tier was set.
    if (isAdminGrantedAccess()) {
      // Still read the stored tier so the UI shows the correct plan label,
      // but if it's Free we upgrade it to Premium for rule purposes.
      const directTier = localStorage.getItem(PLAN_STORAGE_KEY) || localStorage.getItem('profile_plan');
      if (directTier === 'Premium') return 'Premium';
      if (directTier === 'Pro') return 'Pro';
      if (directTier === 'Starter') return 'Starter';
      // Free tier granted by admin → treat as Premium (full access)
      return 'Premium';
    }

    // 1. Direct tier override
    const directTier = localStorage.getItem(PLAN_STORAGE_KEY) || localStorage.getItem('profile_plan');
    if (directTier === 'Premium' || directTier === 'Pro' || directTier === 'Starter') {
      return directTier;
    }

    // 2. Active subscription payload
    const subRaw = localStorage.getItem('hage_subscription_status');
    if (subRaw) {
      const parsed = JSON.parse(subRaw);
      if (parsed?.active) {
        const planName = (parsed.plan || '').toLowerCase();
        const duration = (parsed.duration || '').toLowerCase();
        const method = (parsed.paymentMethod || '').toLowerCase();

        if (duration === 'sixmonths' || planName.includes('premium') || planName.includes('6 month')) {
          return 'Premium';
        }
        if (duration === 'threemonths' || planName.includes('pro') || planName.includes('3 month')) {
          return 'Pro';
        }
        if (duration === 'onemonth' || planName.includes('starter') || planName.includes('1 month')) {
          return 'Starter';
        }
        // Admin-granted Free tier (detected via payment method in payload)
        if (method.includes('manual admin') || method.includes('active access')) {
          return 'Premium';
        }
        return 'Starter';
      }
    }

    // 3. User profile role or plan
    const profilePlan = localStorage.getItem('profile_plan');
    if (profilePlan === 'Premium') return 'Premium';
    if (profilePlan === 'Pro') return 'Pro';
    if (profilePlan === 'Starter') return 'Starter';
  } catch (_) {}

  return 'Free';
}

export function setUserPlan(plan: PlanType): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, plan);
    localStorage.setItem('profile_plan', plan);
    localStorage.removeItem('hage_subscription_expired');
    localStorage.setItem('user_subscription_status', 'Active');
    localStorage.setItem('profile_status', 'Active');
    localStorage.setItem('hage_subscription_status', JSON.stringify({
      active: true,
      status: 'Active',
      plan,
      duration: plan === 'Starter' ? 'oneMonth' : plan === 'Pro' ? 'threeMonths' : plan === 'Premium' ? 'sixMonths' : 'free',
      subscribedAt: new Date().toISOString(),
      expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
    window.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan } }));
    window.dispatchEvent(new CustomEvent('subscriptionStatusChanged'));
  } catch (_) {}
}

/**
 * Calculates billable trading accounts against subscription limit.
 * RULE: If a user has a challenge account and passes Phase 1 and advances/connects to Phase 2 (or Funded),
 * the connected phases belong to the same challenge progression and count as 1 SINGLE account.
 */
export function countBillableAccounts(campaigns: any[]): number {
  if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) return 0;

  const campaignMap = new Map<string, any>(campaigns.map(c => [String(c.id), c]));
  const challengeRoots = new Set<string>();
  let standaloneCount = 0;

  campaigns.forEach(c => {
    // Check if this account belongs to a challenge progression
    const isChallengePhase = c.phase === 'Phase 1' || c.phase === 'Phase 2' || c.phase === 'Funded';
    const hasParentLink = Boolean(c.parentCampaignId && campaignMap.has(String(c.parentCampaignId)));
    const hasChildLink = campaigns.some(other => String(other.parentCampaignId) === String(c.id));

    if (isChallengePhase || hasParentLink || hasChildLink) {
      // Trace parent pointers back to the original Phase 1 challenge root
      let curr: any = c;
      const visited = new Set<string>();
      while (curr && curr.parentCampaignId && campaignMap.has(String(curr.parentCampaignId)) && !visited.has(String(curr.id))) {
        visited.add(String(curr.id));
        curr = campaignMap.get(String(curr.parentCampaignId));
      }

      if (curr) {
        challengeRoots.add(String(curr.id));
      } else {
        challengeRoots.add(String(c.id));
      }
    } else {
      // Regular standalone trading account
      standaloneCount++;
    }
  });

  return challengeRoots.size + standaloneCount;
}

export function canAddAccount(
  currentAccountsCountOrCampaigns: number | any[],
  isConnectingNextPhase: boolean = false
): {
  allowed: boolean;
  maxAllowed: number;
  currentPlan: PlanType;
  message?: string;
  nextPlan: PlanType;
  billableCount: number;
} {
  if (isDashboardReadOnly()) {
    return {
      allowed: false,
      maxAllowed: 0,
      currentPlan: 'Free',
      nextPlan: 'Starter',
      billableCount: 0,
      message: 'Subscription Ended: Your subscription has ended. Dashboard is in Read-Only mode. Please renew your subscription to connect new accounts.'
    };
  }

  const plan = getUserPlan();
  const rules = PLAN_RULES[plan];

  const billableCount = Array.isArray(currentAccountsCountOrCampaigns)
    ? countBillableAccounts(currentAccountsCountOrCampaigns)
    : (typeof currentAccountsCountOrCampaigns === 'number' ? currentAccountsCountOrCampaigns : 0);

  // If advancing / connecting Phase 2 of a passed Phase 1 challenge,
  // it belongs to the same challenge chain and is allowed!
  if (isConnectingNextPhase) {
    return {
      allowed: true,
      maxAllowed: rules.maxAccounts,
      currentPlan: plan,
      nextPlan: plan === 'Free' ? 'Starter' : plan === 'Starter' ? 'Pro' : 'Premium',
      billableCount
    };
  }

  if (billableCount >= rules.maxAccounts) {
    const nextPlan: PlanType = plan === 'Free' ? 'Starter' : plan === 'Starter' ? 'Pro' : 'Premium';
    const limitMsg =
      plan === 'Starter'
        ? `Starter (1 Month) Limit: You have reached your limit of 2 trading accounts. Upgrade to Pro for up to 10 accounts, or Premium for unlimited.`
        : plan === 'Pro'
        ? `Pro (3 Months) Limit: You have reached your limit of 10 trading accounts. Upgrade to Premium for unlimited accounts.`
        : `Free Plan Limit: You can only have 1 trading account. Upgrade to Starter (2 accounts), Pro (10 accounts), or Premium (unlimited).`;

    return {
      allowed: false,
      maxAllowed: rules.maxAccounts,
      currentPlan: plan,
      nextPlan,
      billableCount,
      message: limitMsg
    };
  }

  return {
    allowed: true,
    maxAllowed: rules.maxAccounts,
    currentPlan: plan,
    nextPlan: plan === 'Free' ? 'Starter' : plan === 'Starter' ? 'Pro' : 'Premium',
    billableCount
  };
}

export function canAddTrade(tradesThisMonthCount: number): {
  allowed: boolean;
  maxAllowed: number;
  currentPlan: PlanType;
  remaining: number;
  message?: string;
} {
  if (isDashboardReadOnly()) {
    return {
      allowed: false,
      maxAllowed: 0,
      currentPlan: 'Free',
      remaining: 0,
      message: 'Subscription Ended: Your 1-month subscription has ended. Dashboard is in Read-Only mode. Please renew your plan to log new trades.'
    };
  }

  const plan = getUserPlan();
  const rules = PLAN_RULES[plan];

  if (rules.maxTradesPerMonth !== Infinity && tradesThisMonthCount >= rules.maxTradesPerMonth) {
    return {
      allowed: false,
      maxAllowed: rules.maxTradesPerMonth,
      currentPlan: plan,
      remaining: 0,
      message: `Monthly Trade Limit Reached: Free plan allows up to 50 trades per month. Upgrade to Pro for Unlimited Trades!`
    };
  }

  return {
    allowed: true,
    maxAllowed: rules.maxTradesPerMonth,
    currentPlan: plan,
    remaining: rules.maxTradesPerMonth === Infinity ? Infinity : Math.max(0, rules.maxTradesPerMonth - tradesThisMonthCount)
  };
}

export function canTrackChallenges(): boolean {
  const plan = getUserPlan();
  return PLAN_RULES[plan].hasChallengeTracking;
}

export function canAccessAdvancedAnalytics(): boolean {
  const plan = getUserPlan();
  return PLAN_RULES[plan].hasAdvancedAnalytics;
}
