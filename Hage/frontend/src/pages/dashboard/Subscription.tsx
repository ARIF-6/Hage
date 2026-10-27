import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard, CheckCircle2, Clock, Zap,
  Star, Shield, TrendingUp, BarChart2,
  Calendar, ArrowRight, Sparkles, ArrowUp, Lock, RefreshCw, AlertTriangle
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

const DEFAULT_PRICING = { oneMonth: 2.99, threeMonths: 4.99, sixMonths: 9.99 };

const FEATURES = [
  { icon: BarChart2,  text: 'Full Advanced Analytics Dashboard' },
  { icon: TrendingUp, text: 'Unlimited Trade Journal Entries' },
  { icon: Shield,     text: 'Multi-Account Challenge Tracking' },
  { icon: Zap,        text: 'Real-Time P&L & Drawdown Alerts' },
  { icon: Star,       text: 'Payout Management & Certificates' },
  { icon: Calendar,   text: 'Trade Calendar & Performance Reports' },
];

const PLANS = [
  {
    key: 'oneMonth' as const,
    label: 'Starter (1 Month)',
    planName: 'Starter',
    hint: 'Entry level',
    badge: null,
    accountsLimit: '2 Accounts',
    gradient: 'from-sky-500/10 to-cyan-500/5',
    border: 'border-sky-500/30',
    activeBorder: 'border-sky-500',
    badgeBg: '',
    months: 1,
  },
  {
    key: 'threeMonths' as const,
    label: 'Pro (3 Months)',
    planName: 'Pro',
    hint: 'Most Popular',
    badge: '🔥 Popular',
    accountsLimit: '10 Accounts',
    gradient: 'from-indigo-500/15 to-violet-500/10',
    border: 'border-indigo-500/40',
    activeBorder: 'border-indigo-500',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    months: 3,
  },
  {
    key: 'sixMonths' as const,
    label: 'Premium (6 Months)',
    planName: 'Premium',
    hint: 'Best Value',
    badge: '⭐ Best Deal',
    accountsLimit: 'Unlimited Accounts',
    gradient: 'from-violet-500/15 to-purple-500/10',
    border: 'border-violet-500/40',
    activeBorder: 'border-violet-500',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    months: 6,
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
  const [activeDuration, setActiveDuration] = useState<string | null>(null); // e.g. 'oneMonth'
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
    // Check URL param e.g. ?plan=premium or ?plan=starter
    const requested = (searchParams.get('plan') || '').toLowerCase();
    if (requested.includes('prem')) setSelectedPlan('sixMonths');
    else if (requested.includes('start')) setSelectedPlan('oneMonth');
    else if (requested.includes('pro')) setSelectedPlan('threeMonths');

    // Load admin-set pricing from pricingStore
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

  // Plan order for upgrade/downgrade comparison
  const PLAN_ORDER: Record<string, number> = { oneMonth: 1, threeMonths: 2, sixMonths: 3 };
  const currentPlanOrder = PLAN_ORDER[activeDuration || ''] ?? 0;
  const selectedPlanOrder = PLAN_ORDER[selectedPlan];
  const isUpgrade = isActive && selectedPlanOrder > currentPlanOrder;
  const isDowngrade = isActive && selectedPlanOrder < currentPlanOrder;
  const isSamePlan = isActive && selectedPlanOrder === currentPlanOrder;

  // Price difference for upgrade (new price - already paid price)
  const pricePaid = activeDuration ? pricing[activeDuration as keyof typeof pricing] : 0;
  const upgradePrice = Math.max(0, selectedPrice - pricePaid).toFixed(2);

  const handleToggleSimulation = () => {
    const nextExpired = !subscriptionStatus.isExpired;
    setSubscriptionExpired(nextExpired);
    syncStatus();
    window.dispatchEvent(new Event('subscriptionStatusChanged'));
  };

  const handleSubscribe = () => {
    if (isDowngrade) return; // blocked
    setShowCryptoModal(true);
  };

  const handlePaymentSuccess = async (paidPlanKey: string) => {
    setShowCryptoModal(false);
    const plan = PLANS.find(p => p.key === paidPlanKey) || PLANS.find(p => p.key === selectedPlan)!;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + plan.months);

    // Fix: map plan durations correctly to tier names
    const targetTier =
      plan.key === 'sixMonths'   ? 'Premium' :
      plan.key === 'threeMonths' ? 'Pro'     :
      'Starter';  // oneMonth → Starter (NOT Free)

    // 1. Optimistically set plan locally
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

    // 2. Fetch authoritative plan from backend and sync localStorage
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            HAGE Pro Access
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            Unlock the Full Platform
          </h1>
          <p className="text-gray-500 dark:text-slate-400 max-w-md mx-auto text-sm">
            One affordable plan. Full access to every feature. Cancel anytime.
          </p>


        </div>

        {/* Onboarding Welcome / Must Purchase First Banner */}
        {(!hasUserPurchasedPlan() || searchParams.get('onboarding') === 'true' || searchParams.get('purchase_required') === 'true') && !isActive && !subscriptionStatus.isExpired && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-600/15 via-indigo-600/15 to-purple-600/15 border-2 border-indigo-500/40 shadow-xl shadow-indigo-500/5 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4 sm:gap-5"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  Step 2 of 2: Subscription Required
                </span>
                <span className="text-xs text-gray-400 font-bold">•</span>
                <span className="text-xs font-bold text-gray-600 dark:text-slate-300">Account Registered</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                Choose a Plan to Activate Your Trading Dashboard
              </h2>
              <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed max-w-2xl">
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
            className="p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/40 dark:border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-amber-900 dark:text-amber-200 text-sm sm:text-base">
                    Your 1-Month Subscription has Ended
                  </p>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                    Read-Only Mode
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed max-w-2xl">
                  Your subscription month has ended. Your dashboard has been switched to <strong>Read-Only Mode</strong>. You can view all your charts, historical trade logs, analytics, and certificates, but management actions (adding trades, connecting accounts, requesting payouts) are locked. Renew your plan below to restore full dashboard management.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleSimulation}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
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
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-emerald-400 text-sm">Subscription Active — {activePlan}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">
                  Expires: {activeExpiry ? new Date(activeExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
            >
              Cancel Subscription
            </button>
          </motion.div>
        )}

        {subscribeSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-bold text-emerald-400">
              {isActive ? 'Plan upgraded! 🎉 Your new access is now active.' : "You're subscribed! 🎉 Full access is now active."}
            </p>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Plan Selection */}
          <div className="lg:col-span-2 space-y-4">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Choose Your Duration</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {PLANS.map((plan, i) => {
                const price = pricing[plan.key];
                const ppm = (price / plan.months).toFixed(2);
                const isSelected = selectedPlan === plan.key;
                return (
                  <motion.button
                    key={plan.key}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedPlan(plan.key)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all bg-gradient-to-br ${plan.gradient} ${
                      isSelected
                        ? `${plan.activeBorder} shadow-lg`
                        : `${plan.border} hover:border-opacity-70`
                    }`}
                  >
                    {plan.badge && (
                      <span className={`absolute -top-2 left-3 text-[10px] font-black px-2 py-0.5 rounded-full border ${plan.badgeBg}`}>
                        {plan.badge}
                      </span>
                    )}

                    <div className="mt-1">
                      <p className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{plan.hint}</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white">{plan.label}</p>

                      <div className="mt-3">
                        <span className="text-2xl font-black text-gray-900 dark:text-white">${price.toFixed(2)}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-500 ml-1">total</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-gray-200/60 dark:border-slate-800">
                        <span className="text-gray-500 dark:text-slate-500">≈ ${ppm}/mo</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                          {plan.accountsLimit}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Challenge Account Progression Note */}
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3.5 flex items-start gap-2.5 text-xs text-indigo-300">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong className="text-white">Challenge Accounts:</strong> If you pass Phase 1 and advance/connect Phase 2, both phases count as <strong className="text-emerald-400">1 single account</strong> towards your plan limit.
              </p>
            </div>

            {/* Features list */}
            <div className="rounded-2xl bg-gray-50 dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] p-5">
              <p className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4">Everything Included</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {FEATURES.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Order Summary</p>
            <div className="rounded-2xl bg-gray-50 dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] p-5 space-y-4 sticky top-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-[#1E293B]">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">HAGE Pro</p>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400">{selectedMeta.label} subscription</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Duration</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedMeta.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Price / month</span>
                  <span className="font-semibold text-gray-700 dark:text-slate-300">${pricePerMonth}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-[#1E293B]">
                  <span className="font-bold text-gray-900 dark:text-white">Total Due</span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">${selectedPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-700 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Access expires {selectedMeta.months} month{selectedMeta.months > 1 ? 's' : ''} after purchase</span>
              </div>

              {/* Upgrade notice */}
              {isUpgrade && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-[11px] text-indigo-400"
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
                  className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-400"
                >
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-0.5">Downgrade not available</p>
                    <p>You're currently on a higher plan. Cancel your subscription first to switch to a lower plan.</p>
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleSubscribe}
                disabled={subscribing || isSamePlan || isDowngrade}
                className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                  isSamePlan
                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                    : isDowngrade
                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 cursor-not-allowed'
                    : isUpgrade
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 active:scale-95 cursor-pointer'
                    : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95 cursor-pointer'
                }`}
              >
                {subscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

              <p className="text-[10px] text-center text-gray-400 dark:text-slate-500">
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
