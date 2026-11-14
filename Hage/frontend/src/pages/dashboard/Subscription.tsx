import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard, CheckCircle2, Clock, Zap,
  Star, Shield, TrendingUp, BarChart2,
  Calendar, ArrowRight, Sparkles, ArrowUp, Lock, RefreshCw, AlertTriangle, Check
} from 'lucide-react';
import {
  setUserPlan,
  getSubscriptionStatus,
  setSubscriptionExpired,
  hasUserPurchasedPlan,
  type SubscriptionStatusInfo
} from '../../store/subscriptionRules';
import { loadPlanPricing, fetchRemotePricing } from '../../store/pricingStore';
import { CryptoPaymentModal } from '../../components/ui/CryptoPaymentModal';
import { refreshSubscriptionFromBackend } from '../../services/paymentService';

// ── Color tokens ──────────────────────────────────────────────────────────────
const NAVY = '#0E235C';
const NAVY_HOVER = '#091A44';
const NAVY_FAINT = 'rgba(14, 35, 92, 0.07)';
const NAVY_BORDER = 'rgba(14, 35, 92, 0.22)';
const BLUE_ACCENT = '#1D4ED8';

const DEFAULT_PRICING = { oneMonth: 2.99, threeMonths: 4.99, sixMonths: 9.99 };

const PLANS = [
  {
    key: 'oneMonth' as const,
    label: 'Starter (1 Month)',
    planName: 'Starter',
    duration: '1 Month',
    hint: 'Entry level',
    badge: null,
    months: 1,
    features: [
      '2 Trading Accounts',
      'Unlimited Trades',
      'Advanced Analytics',
      'Challenge Tracking & Phases',
    ],
  },
  {
    key: 'threeMonths' as const,
    label: 'Pro (3 Months)',
    planName: 'Pro',
    duration: '3 Months',
    hint: 'Most Popular',
    badge: '🔥 Popular',
    months: 3,
    features: [
      '10 Trading Accounts',
      'Unlimited Trades',
      'Advanced Analytics',
      'Challenge Tracking & Phases',
    ],
  },
  {
    key: 'sixMonths' as const,
    label: 'Premium (6 Months)',
    planName: 'Premium',
    duration: '6 Months',
    hint: 'Best Value',
    badge: '⭐ Best Deal',
    months: 6,
    features: [
      'Unlimited Trading Accounts',
      'Unlimited Trades',
      'Advanced Analytics',
      'Challenge Tracking & Phases',
    ],
  },
];

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [selectedPlan, setSelectedPlan] = useState<'oneMonth' | 'threeMonths' | 'sixMonths'>('threeMonths');
  const [isActive, setIsActive] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [activeExpiry, setActiveExpiry] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [activeDuration, setActiveDuration] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusInfo>(() => getSubscriptionStatus());

  const syncStatus = () => {
    const status = getSubscriptionStatus();
    setSubscriptionStatus(status);
    if (status.isActive) {
      setIsActive(true);
      setActivePlan(status.planName);
      setActiveExpiry(status.expiryDate);
      setActiveDuration(status.planDuration || null);
    } else {
      setIsActive(false);
      if (status.isExpired) {
        setActivePlan(status.planName);
        setActiveExpiry(status.expiryDate);
        setActiveDuration(status.planDuration || null);
      }
    }
  };

  useEffect(() => {
    const requested = (searchParams.get('plan') || '').toLowerCase();
    if (requested.includes('prem')) setSelectedPlan('sixMonths');
    else if (requested.includes('start')) setSelectedPlan('oneMonth');
    else if (requested.includes('pro')) setSelectedPlan('threeMonths');

    try {
      const planPrices = loadPlanPricing();
      if (planPrices) {
        setPricing({
          oneMonth: planPrices.Starter.monthly ?? DEFAULT_PRICING.oneMonth,
          threeMonths: planPrices.Pro.monthly ?? DEFAULT_PRICING.threeMonths,
          sixMonths: planPrices.Premium.monthly ?? DEFAULT_PRICING.sixMonths,
        });
      }
    } catch (_) {}

    fetchRemotePricing().then((remote) => {
      if (remote) {
        setPricing({
          oneMonth: remote.Starter.monthly ?? DEFAULT_PRICING.oneMonth,
          threeMonths: remote.Pro.monthly ?? DEFAULT_PRICING.threeMonths,
          sixMonths: remote.Premium.monthly ?? DEFAULT_PRICING.sixMonths,
        });
      }
    }).catch(() => {});

    syncStatus();

    const token = localStorage.getItem('token') || '';
    if (token) {
      refreshSubscriptionFromBackend(token).then(() => syncStatus()).catch(() => {});
    }

    const handleStatusEvent = () => syncStatus();
    window.addEventListener('subscriptionStatusChanged', handleStatusEvent);
    window.addEventListener('storage', handleStatusEvent);
    return () => {
      window.removeEventListener('subscriptionStatusChanged', handleStatusEvent);
      window.removeEventListener('storage', handleStatusEvent);
    };
  }, [searchParams]);

  const selectedMeta = PLANS.find(p => p.key === selectedPlan)!;
  const selectedPrice = pricing[selectedPlan];
  const pricePerMonth = (selectedPrice / selectedMeta.months).toFixed(2);

  const PLAN_ORDER: Record<string, number> = { oneMonth: 1, threeMonths: 2, sixMonths: 3 };
  const currentPlanOrder = PLAN_ORDER[activeDuration || ''] ?? 0;
  const selectedPlanOrder = PLAN_ORDER[selectedPlan];
  const isUpgrade = isActive && selectedPlanOrder > currentPlanOrder;
  const isDowngrade = isActive && selectedPlanOrder < currentPlanOrder;
  const isSamePlan = isActive && selectedPlanOrder === currentPlanOrder;

  const pricePaid = activeDuration ? pricing[activeDuration as keyof typeof pricing] : 0;
  const upgradePrice = Math.max(0, selectedPrice - pricePaid).toFixed(2);

  const handleToggleSimulation = () => {
    const nextExpired = !subscriptionStatus.isExpired;
    setSubscriptionExpired(nextExpired);
    syncStatus();
    window.dispatchEvent(new Event('subscriptionStatusChanged'));
  };

  const handleSubscribe = () => {
    if (isDowngrade) return;
    setShowCryptoModal(true);
  };

  const handlePaymentSuccess = async (paidPlanKey: string) => {
    setShowCryptoModal(false);
    const plan = PLANS.find(p => p.key === paidPlanKey) || PLANS.find(p => p.key === selectedPlan)!;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + plan.months);

    const targetTier =
      plan.key === 'sixMonths'   ? 'Premium' :
      plan.key === 'threeMonths' ? 'Pro'     :
      'Starter';

    setUserPlan(targetTier);

    const subData = {
      active: true,
      plan: plan.label,
      duration: plan.key,
      price: pricing[plan.key],
      expiry: expiry.toISOString(),
      subscribedAt: new Date().toISOString(),
      paymentMethod: 'Crypto (USDT BEP20)',
    };
    localStorage.setItem('hage_subscription_status', JSON.stringify(subData));
    setSubscriptionExpired(false);
    localStorage.removeItem('hage_subscription_expired');

    const token = localStorage.getItem('token') || '';
    if (token) {
      await refreshSubscriptionFromBackend(token);
    }

    syncStatus();
    setSubscribeSuccess(true);
    window.dispatchEvent(new Event('subscriptionStatusChanged'));
    setTimeout(() => {
      setSubscribeSuccess(false);
      navigate('/dashboard');
    }, 1200);
  };

  const handleCancel = () => {
    localStorage.removeItem('hage_subscription_status');
    setSubscriptionExpired(false);
    localStorage.removeItem('hage_subscription_expired');
    setUserPlan('Free');
    setIsActive(false);
    setActivePlan(null);
    setActiveExpiry(null);
    setActiveDuration(null);
    syncStatus();
    window.dispatchEvent(new Event('subscriptionStatusChanged'));
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full pb-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-2 shadow-xs bg-[#0E235C]/10 dark:bg-blue-950/70 border border-[#0E235C]/20 dark:border-blue-800/60 text-[#0E235C] dark:text-blue-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            HAGE Pro Access
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Unlock the Full Platform
          </h1>
          <p className="max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400">
            One affordable plan. Full access to every feature. Cancel anytime.
          </p>
        </div>

        {/* Onboarding Welcome / Must Purchase First Banner */}
        {(!hasUserPurchasedPlan() || searchParams.get('onboarding') === 'true' || searchParams.get('purchase_required') === 'true') && !isActive && !subscriptionStatus.isExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 sm:p-6 rounded-2xl text-center sm:text-left flex flex-col sm:flex-row items-center gap-4 sm:gap-5 bg-white dark:bg-[#0E131F] border-2 border-[#0E235C]/25 dark:border-blue-500/30 shadow-lg shadow-[#0E235C]/5 dark:shadow-blue-900/20"
          >
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 bg-[#0E235C] text-white shadow-md shadow-[#0E235C]/30"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0E235C]/10 dark:bg-blue-950/80 text-[#0E235C] dark:text-blue-300 border border-[#0E235C]/25 dark:border-blue-800/60"
                >
                  Step 2 of 2: Subscription Required
                </span>
                <span className="text-xs font-bold text-[#0E235C] dark:text-blue-400">•</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Account Registered</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Choose a Plan to Activate Your Trading Dashboard
              </h2>
              <p className="text-xs leading-relaxed max-w-2xl text-slate-600 dark:text-slate-400">
                Welcome to HAGE! Your account has been created. To unlock your trading accounts, challenge tracking, journal, and live analytics, please purchase a subscription plan below.
              </p>
            </div>
          </motion.div>
        )}

        {/* Subscription Expired / Read-Only Banner */}
        {subscriptionStatus.isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0E131F] border-2 border-[#0E235C]/20 dark:border-blue-500/30 shadow-md"
          >
            <div className="flex items-start gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#0E235C]/10 dark:bg-blue-950/60 border border-[#0E235C]/20 dark:border-blue-800/60"
              >
                <Lock className="w-5 h-5 text-[#0E235C] dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Your Subscription has Ended
                  </p>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0E235C]/10 dark:bg-blue-950/70 text-[#0E235C] dark:text-blue-300 border border-[#0E235C]/20 dark:border-blue-800/60"
                  >
                    Read-Only Mode
                  </span>
                </div>
                <p className="text-xs leading-relaxed max-w-2xl text-slate-600 dark:text-slate-400">
                  Your subscription has ended. Your dashboard has been switched to <strong className="text-slate-900 dark:text-white">Read-Only Mode</strong>. You can view all your charts, historical trade logs, analytics, and certificates, but management actions are locked. Renew your plan below to restore full dashboard management.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleSimulation}
                className="text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Simulation</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Active Subscription Banner */}
        {isActive && !subscriptionStatus.isExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0E131F] border border-blue-200 dark:border-blue-800/60 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60"
              >
                <CheckCircle2 className="w-5 h-5 text-[#0E235C] dark:text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#0E235C] dark:text-blue-300">Subscription Active — {activePlan}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Expires: {activeExpiry ? new Date(activeExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-300"
            >
              Cancel Subscription
            </button>
          </motion.div>
        )}

        {subscribeSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl text-center bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800"
          >
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#0E235C] dark:text-blue-400" />
            <p className="font-bold text-[#0E235C] dark:text-blue-200">
              {isActive ? 'Plan upgraded! 🎉 Your new access is now active.' : "You're subscribed! 🎉 Full access is now active."}
            </p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Plan Selection */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Choose Your Duration
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {PLANS.map((plan, i) => {
                const price = pricing[plan.key];
                const ppm = (price / plan.months).toFixed(2);
                const isSelected = selectedPlan === plan.key;
                return (
                  <motion.div
                    key={plan.key}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative flex flex-col p-6 rounded-2xl cursor-pointer transition-all duration-200 bg-white dark:bg-[#0E131F] ${
                      isSelected
                        ? 'border-2 border-[#0E235C] dark:border-blue-500 shadow-xl shadow-[#0E235C]/10 dark:shadow-blue-500/15 ring-2 ring-[#0E235C]/10 dark:ring-blue-500/25'
                        : 'border border-slate-200 dark:border-slate-800 hover:border-[#0E235C]/40 dark:hover:border-blue-500/50 shadow-xs hover:shadow-md'
                    }`}
                  >
                    {plan.badge && (
                      <span
                        className="absolute -top-3 left-4 text-[11px] font-black px-3 py-1 rounded-full bg-[#0E235C] text-white shadow-md shadow-[#0E235C]/30 flex items-center gap-1"
                      >
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {plan.planName}
                      </h3>
                      {isSelected && (
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#0E235C] text-white shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 my-3">
                      <span className={`text-3xl sm:text-4xl font-extrabold ${isSelected ? 'text-[#0E235C] dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {plan.months === 1 ? '/mo' : 'total'}
                      </span>
                    </div>

                    {plan.months > 1 && (
                      <p className="text-xs font-semibold -mt-2 mb-4 text-[#0E235C] dark:text-blue-400">
                        ≈ ${ppm}/mo ({plan.duration})
                      </p>
                    )}

                    <ul className="space-y-3.5 my-5 flex-grow">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0E235C] dark:text-blue-400" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <div
                      className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(plan.key);
                        }}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#0E235C] hover:bg-[#091A44] text-white shadow-md shadow-[#0E235C]/25'
                            : 'bg-transparent text-[#0E235C] dark:text-blue-400 border-2 border-[#0E235C] dark:border-blue-500 hover:bg-[#0E235C] hover:text-white dark:hover:bg-blue-600 dark:hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-4 h-4 text-white" />
                            {plan.planName} Selected
                          </>
                        ) : (
                          `Get ${plan.planName}`
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Order Summary
            </p>
            <div
              className="rounded-2xl p-5 space-y-4 sticky top-6 bg-white dark:bg-[#0E131F] border border-slate-200 dark:border-slate-800 shadow-lg shadow-black/5"
            >
              <div
                className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#0E235C]/10 dark:bg-blue-950/60 border border-[#0E235C]/20 dark:border-blue-800/60"
                >
                  <CreditCard className="w-5 h-5 text-[#0E235C] dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">HAGE Pro</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedMeta.label} subscription</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Duration</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedMeta.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Price / month</span>
                  <span className="font-semibold text-slate-900 dark:text-white">${pricePerMonth}</span>
                </div>
                <div
                  className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800"
                >
                  <span className="font-bold text-slate-900 dark:text-white">Total Due</span>
                  <span className="text-2xl font-black text-[#0E235C] dark:text-blue-400">${selectedPrice.toFixed(2)}</span>
                </div>
              </div>

              <div
                className="flex items-center gap-2 p-2.5 rounded-xl text-[11px] bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#0E235C] dark:text-blue-300 font-medium"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Access expires {selectedMeta.months} month{selectedMeta.months > 1 ? 's' : ''} after purchase</span>
              </div>

              {/* Upgrade notice */}
              {isUpgrade && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-[11px] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[#0E235C] dark:text-blue-300"
                >
                  <ArrowUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">Upgrading from {activePlan}</p>
                    <p>You'll pay the difference: <strong>${upgradePrice}</strong>. Your access will be extended to {selectedMeta.months} month{selectedMeta.months > 1 ? 's' : ''} from today.</p>
                  </div>
                </motion.div>
              )}

              {/* Downgrade notice */}
              {isDowngrade && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl text-[11px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5 text-slate-900 dark:text-white">Downgrade not available</p>
                    <p>You're currently on a higher plan. Cancel your subscription first to switch to a lower plan.</p>
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={subscribing || isSamePlan || isDowngrade}
                className="w-full py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] bg-[#0E235C] hover:bg-[#091A44] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed text-white shadow-lg shadow-[#0E235C]/25 disabled:shadow-none"
              >
                {subscribing ? (
                  <>
                    <div
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    />
                    Processing...
                  </>
                ) : isSamePlan ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Already Subscribed
                  </>
                ) : isDowngrade ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Downgrade Not Available
                  </>
                ) : isUpgrade ? (
                  <>
                    <ArrowUp className="w-4 h-4" />
                    Upgrade — Pay ${upgradePrice}
                  </>
                ) : subscriptionStatus.isExpired ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Renew Subscription for ${selectedPrice.toFixed(2)}
                  </>
                ) : (
                  <>
                    Subscribe for ${selectedPrice.toFixed(2)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
                No auto-renewal. One-time payment. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {showCryptoModal && (
        <CryptoPaymentModal
          planKey={selectedPlan}
          planLabel={`HAGE ${selectedMeta.label}`}
          usdAmount={isUpgrade ? Number(upgradePrice) : selectedPrice}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowCryptoModal(false)}
        />
      )}
    </div>
  );
}
