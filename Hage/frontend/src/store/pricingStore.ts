/**
 * Centralized subscription pricing store.
 * 3 Active Plans:
 *   - Starter: $2.99 /mo
 *   - Pro:     $4.99 /mo (Most Popular)
 *   - Premium: $9.99 /mo
 *
 * Admin can manage pricing in:
 *   1. Admin > Subscriptions
 *   2. Admin > Settings
 */
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export interface PlanPricing {
  monthly: number;
  annual: number;
  threeMonths?: number;
  sixMonths?: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

export interface AllPlanPricing {
  Starter: PlanPricing;
  Pro: PlanPricing;
  Premium: PlanPricing;
  Free?: PlanPricing;
}

const STORAGE_KEY = 'hage_plan_pricing';

export const DEFAULT_PLAN_PRICING: AllPlanPricing = {
  Starter: {
    monthly: 2.99,
    annual: 29.99,
    currency: 'USD',
    features: [
      '2 Trading Accounts',
      'Unlimited Trades',
      'Advanced Analytics',
      'Challenge Tracking & Phases'
    ]
  },
  Pro: {
    monthly: 4.99,
    annual: 49.99,
    threeMonths: 12.99,
    sixMonths: 24.99,
    currency: 'USD',
    popular: true,
    features: [
      '10 Trading Accounts',
      'Unlimited Trades',
      'Advanced Analytics',
      'Challenge Tracking & Phases'
    ]
  },
  Premium: {
    monthly: 9.99,
    annual: 99.99,
    threeMonths: 26.99,
    sixMonths: 49.99,
    currency: 'USD',
    features: [
      'Everything in Pro',
      'Unlimited Trading Accounts',
      'Unlimited Trades',
      'MT5 Integration',
      'AI Trade Analysis'
    ]
  },
  get Free() {
    return this.Starter;
  }
};

export function loadPlanPricing(): AllPlanPricing {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const starter = parsed.Starter || parsed.Free || DEFAULT_PLAN_PRICING.Starter;
      const parseNum = (val: any, fallback: number) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0 ? num : fallback;
      };

      return {
        Starter: {
          ...DEFAULT_PLAN_PRICING.Starter,
          ...starter,
          monthly: parseNum(starter.monthly, DEFAULT_PLAN_PRICING.Starter.monthly),
          annual: parseNum(starter.annual, DEFAULT_PLAN_PRICING.Starter.annual)
        },
        Pro: {
          ...DEFAULT_PLAN_PRICING.Pro,
          ...parsed.Pro,
          monthly: parseNum(parsed.Pro?.monthly, DEFAULT_PLAN_PRICING.Pro.monthly),
          annual: parseNum(parsed.Pro?.annual, DEFAULT_PLAN_PRICING.Pro.annual)
        },
        Premium: {
          ...DEFAULT_PLAN_PRICING.Premium,
          ...parsed.Premium,
          monthly: parseNum(parsed.Premium?.monthly, DEFAULT_PLAN_PRICING.Premium.monthly),
          annual: parseNum(parsed.Premium?.annual, DEFAULT_PLAN_PRICING.Premium.annual)
        },
        get Free() { return this.Starter; }
      };
    }
  } catch (_) {}
  return DEFAULT_PLAN_PRICING;
}

export async function fetchRemotePricing(): Promise<AllPlanPricing> {
  try {
    const res = await axios.get(`${API_BASE}/pricing`);
    if (res.data?.pricing) {
      const p = res.data.pricing;
      const starter = p.Starter || p.Free || DEFAULT_PLAN_PRICING.Starter;
      const parseNum = (val: any, fallback: number) => {
        const num = Number(val);
        return !isNaN(num) && num >= 0 ? num : fallback;
      };

      const merged: AllPlanPricing = {
        Starter: {
          ...DEFAULT_PLAN_PRICING.Starter,
          ...starter,
          monthly: parseNum(starter.monthly, DEFAULT_PLAN_PRICING.Starter.monthly),
          annual: parseNum(starter.annual, DEFAULT_PLAN_PRICING.Starter.annual)
        },
        Pro: {
          ...DEFAULT_PLAN_PRICING.Pro,
          ...p.Pro,
          monthly: parseNum(p.Pro?.monthly, DEFAULT_PLAN_PRICING.Pro.monthly),
          annual: parseNum(p.Pro?.annual, DEFAULT_PLAN_PRICING.Pro.annual)
        },
        Premium: {
          ...DEFAULT_PLAN_PRICING.Premium,
          ...p.Premium,
          monthly: parseNum(p.Premium?.monthly, DEFAULT_PLAN_PRICING.Premium.monthly),
          annual: parseNum(p.Premium?.annual, DEFAULT_PLAN_PRICING.Premium.annual)
        },
        get Free() { return this.Starter; }
      };
      // Persist remote values to local storage so subsequent offline reads are accurate
      savePlanPricing(merged, false);
      return merged;
    }
  } catch (err) {
    console.warn('Failed to fetch remote pricing, using local storage cache:', err);
  }
  return loadPlanPricing();
}

export async function savePlanPricing(pricing: AllPlanPricing, syncRemote?: boolean): Promise<void> {
  try {
    const payload = {
      Starter: pricing.Starter,
      Pro: pricing.Pro,
      Premium: pricing.Premium
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    // Also sync to hage_subscription_pricing for dashboard subscription view
    localStorage.setItem('hage_subscription_pricing', JSON.stringify({
      Basic: {
        oneMonth: pricing.Starter?.monthly ?? 2.99,
        threeMonths: pricing.Pro?.monthly ?? 4.99,
        sixMonths: pricing.Premium?.monthly ?? 9.99
      }
    }));

    window.dispatchEvent(new CustomEvent('pricingUpdated', { detail: pricing }));

    if (syncRemote) {
      await syncPricingToBackend(pricing);
    }
  } catch (_) {}
}

export async function syncPricingToBackend(pricing: AllPlanPricing, token?: string): Promise<boolean> {
  const authToken = token || localStorage.getItem('token');
  const payload = {
    Starter: pricing.Starter,
    Pro: pricing.Pro,
    Premium: pricing.Premium
  };

  let synced = false;

  // 1. Try public /api/pricing PUT endpoint
  try {
    const res = await axios.put(`${API_BASE}/pricing`, payload);
    if (res.status === 200) {
      synced = true;
    }
  } catch (err) {
    console.warn('Sync via /api/pricing failed, attempting authenticated admin route:', err);
  }

  // 2. Try authenticated admin endpoint if token is present
  if (authToken) {
    try {
      const res = await axios.put(`${API_BASE}/admin/settings/pricing`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.status === 200) {
        synced = true;
      }
    } catch (err) {
      console.warn('Sync via /admin/settings/pricing failed:', err);
    }
  }

  return synced;
}
