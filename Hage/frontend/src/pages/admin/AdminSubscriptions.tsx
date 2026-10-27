import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle2, Clock,
  RefreshCw, X, Edit2, Users, Search,
  Crown, Sparkles, Check, AlertCircle, ArrowUpRight,
  DollarSign, Save, Loader2, Sliders, ChevronDown, ChevronUp, Eye
} from 'lucide-react';
import { adminApi, type SubscriptionItem } from '../../services/adminApi';
import { loadPlanPricing, savePlanPricing, fetchRemotePricing, type AllPlanPricing } from '../../store/pricingStore';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'Free' | 'Pro' | 'Premium'>('all');

  // Plan Pricing Management state
  const [pricing, setPricing] = useState<AllPlanPricing>(() => loadPlanPricing());
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [pricingError, setPricingError] = useState('');
  const [showPricingSection, setShowPricingSection] = useState(true);

  // Edit Subscription Modal state
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'Free' | 'Pro' | 'Premium'>('Free');
  const [selectedStatus, setSelectedStatus] = useState<'Active' | 'Expired' | 'Pending'>('Active');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSubscriptions();
      setSubscriptions(res.subscriptions || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchRemotePricing().then(setPricing);

    const handlePricingUpdated = (e: any) => {
      if (e.detail) setPricing(e.detail);
      else setPricing(loadPlanPricing());
    };
    window.addEventListener('pricingUpdated', handlePricingUpdated);
    return () => window.removeEventListener('pricingUpdated', handlePricingUpdated);
  }, []);

  const handlePriceChange = (plan: keyof AllPlanPricing, field: 'monthly' | 'annual', val: string) => {
    setPricing(prev => ({
      ...prev,
      [plan]: { ...prev[plan], [field]: parseFloat(val) || 0 }
    }));
  };

  const handleSavePricing = async () => {
    setPricingSaving(true);
    setPricingError('');
    try {
      await savePlanPricing(pricing, true);
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 3000);
    } catch (_) {
      setPricingError('Failed to save plan pricing.');
    } finally {
      setPricingSaving(false);
    }
  };

  const handleOpenEdit = (sub: SubscriptionItem) => {
    setEditingSub(sub);
    setSelectedPlan(sub.plan);
    setSelectedStatus(sub.status);
    setSaveSuccess(false);
  };

  const handleSaveSubscription = async () => {
    if (!editingSub) return;
    setSaving(true);
    try {
      await adminApi.updateSubscription(editingSub.user, selectedPlan, selectedStatus);

      const currentEmail = (localStorage.getItem('profile_email') || '').toLowerCase().trim();
      const targetEmail = (editingSub.userEmail || '').toLowerCase().trim();
      if (currentEmail && targetEmail && currentEmail === targetEmail) {
        localStorage.setItem('user_subscription_status', selectedStatus);
        localStorage.setItem('profile_status', selectedStatus);
        localStorage.setItem('profile_plan', selectedPlan);
        localStorage.setItem('hage_user_subscription_tier', selectedPlan);
        if (selectedStatus === 'Active') {
          localStorage.removeItem('hage_subscription_expired');
          localStorage.setItem('hage_subscription_status', JSON.stringify({
            active: true,
            status: 'Active',
            plan: selectedPlan,
            duration: selectedPlan === 'Premium' ? 'sixMonths' : selectedPlan === 'Pro' ? 'threeMonths' : 'free',
            subscribedAt: new Date().toISOString(),
            paymentMethod: 'Active Access'
          }));
        } else if (selectedStatus === 'Expired') {
          localStorage.setItem('hage_subscription_expired', 'true');
        }
        window.dispatchEvent(new CustomEvent('planUpdated'));
        window.dispatchEvent(new CustomEvent('subscriptionStatusChanged'));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditingSub(null);
      }, 1500);
      fetchSubscriptions();
    } catch (err) {
      console.error('Error updating subscription:', err);
    } finally {
      setSaving(false);
    }
  };

  // Filtered subscriptions
  const filtered = subscriptions.filter(sub => {
    if (planFilter !== 'all' && sub.plan !== planFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sub.userName?.toLowerCase().includes(q) ||
      sub.userEmail?.toLowerCase().includes(q) ||
      sub.plan?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Subscriptions & Tiers
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
              {subscriptions.length} Total
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage user subscription plans, tier overrides, expiry dates, and billing access.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowPricingSection(!showPricingSection)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm ${
              showPricingSection
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10'
                : 'bg-white/4 hover:bg-white/8 border-white/6 text-slate-300'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>{showPricingSection ? 'Hide Plan Pricing' : 'Manage Plan Pricing'}</span>
            {showPricingSection ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={fetchSubscriptions}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white/4 hover:bg-white/8 border border-white/6 text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Free Tier', val: summary?.freeCount || 0, icon: Users, color: 'text-slate-400', bg: 'bg-white/5' },
          { label: 'Pro Members', val: summary?.proCount || 0, icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Premium Tier', val: summary?.premiumCount || 0, icon: Crown, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Active Subscriptions', val: summary?.activeCount || 0, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="p-4 rounded-2xl bg-[#0D1120] border border-white/6 hover:border-indigo-500/20 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-white">{stat.val}</div>
            </motion.div>
          );
        })}
      </div>

      {/* PLAN PRICING MANAGEMENT (Connected directly to Home page & Registration) */}
      <AnimatePresence>
        {showPricingSection && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl bg-[#0D1120] border border-amber-500/30 p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden"
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-violet-500 opacity-60" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-inner">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-extrabold text-white text-base">Plan Pricing &amp; Tier Configuration</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live on Home Page
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modify subscription pricing for Free, Pro, and Premium plans. Traders see these prices in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {pricingSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: 5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Pricing saved &amp; updated on Home page!
                  </motion.span>
                )}
                {pricingError && (
                  <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                    {pricingError}
                  </span>
                )}
                <button
                  onClick={handleSavePricing}
                  disabled={pricingSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-600/30 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {pricingSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{pricingSaving ? 'Saving...' : 'Save Plan Pricing'}</span>
                </button>
              </div>
            </div>

            {/* 3 Pricing Cards: Starter ($2.99), Pro ($4.99), Premium ($9.99) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. STARTER */}
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 flex flex-col justify-between hover:border-sky-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      Starter
                    </span>
                    <span className="text-[10px] text-sky-400 font-semibold">Entry Tier ($2.99)</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-sky-300 uppercase tracking-wide">Monthly Price ($/mo)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Starter.monthly}
                          onChange={(e) => handlePriceChange('Starter', 'monthly', e.target.value)}
                          className="w-full pl-7 pr-12 py-2.5 bg-black/40 border border-sky-500/40 focus:border-sky-400 rounded-xl text-white text-base font-black font-mono focus:outline-none transition-all"
                          placeholder="2.99"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-300 text-xs font-semibold">/mo</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Annual Price ($/yr)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Starter.annual}
                          onChange={(e) => handlePriceChange('Starter', 'annual', e.target.value)}
                          className="w-full pl-7 pr-12 py-2 bg-black/30 border border-white/8 focus:border-sky-400 rounded-xl text-white text-xs font-bold font-mono focus:outline-none transition-all"
                          placeholder="29.99"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">/yr</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-sky-500/20 space-y-2">
                    <p className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">Features Shown to Traders:</p>
                    <ul className="space-y-2">
                      {pricing.Starter.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-sky-500/20">
                  <div className="w-full py-2 text-center rounded-xl bg-sky-600/80 text-white text-xs font-bold shadow-md shadow-sky-600/30">
                    Home Button: "Get Starter"
                  </div>
                </div>
              </div>

              {/* 2. PRO */}
              <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/5 p-5 flex flex-col justify-between relative shadow-lg shadow-indigo-500/5">
                <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full shadow-md">
                  Most Popular
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Pro
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold">Funded Traders</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide">Monthly Price ($/mo)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Pro.monthly}
                          onChange={(e) => handlePriceChange('Pro', 'monthly', e.target.value)}
                          className="w-full pl-7 pr-12 py-2.5 bg-black/40 border border-indigo-500/40 focus:border-indigo-400 rounded-xl text-white text-base font-black font-mono focus:outline-none transition-all"
                          placeholder="15.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 text-xs font-semibold">/mo</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Annual Price ($/yr)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Pro.annual}
                          onChange={(e) => handlePriceChange('Pro', 'annual', e.target.value)}
                          className="w-full pl-7 pr-12 py-2 bg-black/30 border border-white/8 focus:border-indigo-400 rounded-xl text-white text-xs font-bold font-mono focus:outline-none transition-all"
                          placeholder="144.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">/yr</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-500/20 space-y-2">
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Features Shown to Traders:</p>
                    <ul className="space-y-2">
                      {pricing.Pro.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-500/20">
                  <div className="w-full py-2 text-center rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/30">
                    Home Button: "Upgrade to Pro"
                  </div>
                </div>
              </div>

              {/* 3. PREMIUM */}
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 flex flex-col justify-between hover:border-violet-500/50 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Premium
                    </span>
                    <span className="text-[10px] text-violet-400 font-semibold">Ultimate Access</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-violet-300 uppercase tracking-wide">Monthly Price ($/mo)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Premium.monthly}
                          onChange={(e) => handlePriceChange('Premium', 'monthly', e.target.value)}
                          className="w-full pl-7 pr-12 py-2.5 bg-black/40 border border-violet-500/40 focus:border-violet-400 rounded-xl text-white text-base font-black font-mono focus:outline-none transition-all"
                          placeholder="29.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-300 text-xs font-semibold">/mo</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Annual Price ($/yr)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pricing.Premium.annual}
                          onChange={(e) => handlePriceChange('Premium', 'annual', e.target.value)}
                          className="w-full pl-7 pr-12 py-2 bg-black/30 border border-white/8 focus:border-violet-400 rounded-xl text-white text-xs font-bold font-mono focus:outline-none transition-all"
                          placeholder="288.00"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">/yr</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-violet-500/20 space-y-2">
                    <p className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">Features Shown to Traders:</p>
                    <ul className="space-y-2">
                      {pricing.Premium.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-violet-500/20">
                  <div className="w-full py-2 text-center rounded-xl bg-white/4 border border-violet-500/30 text-violet-300 text-xs font-bold">
                    Home Button: "Get Premium"
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Live Preview Bar */}
            <div className="p-3.5 rounded-xl bg-white/2 border border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Home Page Pricing Summary:</span>
                <span className="font-bold text-white">Free ($0)</span>
                <span className="text-slate-500">|</span>
                <span className="font-bold text-indigo-400">Pro (${pricing.Pro.monthly}/mo)</span>
                <span className="text-slate-500">|</span>
                <span className="font-bold text-violet-400">Premium (${pricing.Premium.monthly}/mo)</span>
              </div>
              <span className="text-[11px] text-slate-400">Changes apply immediately on save.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tier filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold custom-scrollbar">
          {(['all', 'Free', 'Pro', 'Premium'] as const).map((plan) => {
            const isSelected = planFilter === plan;
            return (
              <button
                key={plan}
                onClick={() => setPlanFilter(plan)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{plan === 'all' ? 'All Tiers' : plan}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriber email..."
            className="w-full bg-[#0D1120] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all"
          />
        </div>
      </div>

      {/* Subscriptions Table Card */}
      <div className="rounded-2xl bg-[#0D1120] border border-white/6 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/6 bg-white/2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Start Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filtered.map((sub, idx) => (
                  <motion.tr
                    key={sub._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-white/2 transition-colors group"
                  >
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-[11px]">
                          {(sub.userName || 'T')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                            {sub.userName || 'Trader'}
                          </p>
                          <p className="text-[10px] text-slate-500">{sub.userEmail || sub.user}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                        sub.plan === 'Premium' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                        sub.plan === 'Pro' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-white/5 text-slate-400 border border-white/10'
                      }`}>
                        {sub.plan === 'Premium' && <Crown className="w-3 h-3 text-violet-400" />}
                        {sub.plan === 'Pro' && <Sparkles className="w-3 h-3 text-indigo-400" />}
                        {sub.plan}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {sub.status}
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {sub.paymentMethod || 'Stripe'}
                    </td>

                    {/* Start Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/3 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all flex items-center gap-1.5 ml-auto text-[11px] font-semibold"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Tier</span>
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tier Modal */}
      <AnimatePresence>
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0D1120] border border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-xs"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/6 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">Override Subscription</h3>
                    <p className="text-slate-400 text-[11px]">
                      {editingSub.userName || 'Trader'} ({editingSub.userEmail || editingSub.user})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditingSub(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    Subscription updated successfully!
                  </motion.div>
                )}

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300">Select Plan Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Free', 'Pro', 'Premium'] as const).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-3 rounded-xl border text-center font-bold transition-all ${
                          selectedPlan === plan
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                            : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border-white/6'
                        }`}
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300">Account Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Active', 'Expired', 'Pending'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          selectedStatus === st
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30'
                            : 'bg-white/3 hover:bg-white/6 text-slate-400 hover:text-white border-white/6'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveSubscription}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 active:scale-98 disabled:opacity-50"
                  >
                    {saving ? 'Updating Tier...' : 'Save Subscription Tier'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
