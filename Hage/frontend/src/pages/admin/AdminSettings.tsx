import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Shield, Bell, Lock, Check,
  AlertTriangle, Save, RefreshCw, Key, ToggleLeft, ToggleRight,
  Sliders, CheckCircle2, DollarSign, CreditCard, Loader2, Server
} from 'lucide-react';
import { loadPlanPricing, savePlanPricing, DEFAULT_PLAN_PRICING, type AllPlanPricing } from '../../store/pricingStore';

interface PlanPrice {
  oneMonth: number;
  threeMonths: number;
  sixMonths: number;
  currency: string;
}

interface PricingState {
  Basic: PlanPrice;
}

const DEFAULT_PRICING: PricingState = {
  Basic: { oneMonth: 1.99, threeMonths: 3.99, sixMonths: 6.99, currency: 'USD' },
};

export default function AdminSettings() {
  // Load settings from persistent storage or default
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('hage_admin_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      maintenanceMode: false,
      autoApprovePayouts: false,
      emailAlerts: true,
      allowRegistrations: true,
      strictDrawdownFlagging: true,
      sessionTimeoutMinutes: 60,
      maxDailyDrawdownPct: 5,
      maxOverallDrawdownPct: 10,
      defaultProfitTargetPct: 8,
      requireEmailVerification: false
    };
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (field: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNumberChange = (field: string, val: number) => {
    setSettings((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem('hage_admin_settings', JSON.stringify(settings));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  // Subscription Pricing state — shared with Home page via pricingStore
  const [pricing, setPricing] = useState<AllPlanPricing>(() => loadPlanPricing());
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingSaved, setPricingSaved] = useState(false);
  const [pricingError, setPricingError] = useState('');

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
      setPricingError('Failed to save pricing.');
    } finally {
      setPricingSaving(false);
    }
  };

  const PLAN_META: { key: keyof AllPlanPricing; label: string; badge: string; color: string; border: string }[] = [
    { key: 'Starter', label: 'Starter Plan ($2.99)', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20', color: 'text-sky-300', border: 'border-sky-500/30' },
    { key: 'Pro',     label: 'Pro Plan ($4.99)',     badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20', color: 'text-indigo-300', border: 'border-indigo-500/30' },
    { key: 'Premium', label: 'Premium Plan ($9.99)', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20', color: 'text-amber-300', border: 'border-amber-500/30' },
  ];


  return (
    <div className="max-w-[1200px] mx-auto w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            Admin Settings &amp; Control Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            System operational configurations, administrative preferences, risk parameters, and security policies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <motion.span
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Settings saved!
            </motion.span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Security & Access Policy */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-6 space-y-5 hover:border-indigo-500/20 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Security &amp; Access Policies</h2>
              <p className="text-[10px] text-slate-400">Authentication constraints and registration control</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/4">
              <div>
                <p className="font-bold text-white">Public Trader Registration</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Allow new visitors to register accounts.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allowRegistrations')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.allowRegistrations ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.allowRegistrations ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/4">
              <div>
                <p className="font-bold text-white">Incident &amp; Error Alerts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send alerts when high-severity exceptions trigger.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('emailAlerts')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.emailAlerts ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.emailAlerts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
              <p className="font-bold text-indigo-300">Role-Based JWT Gate</p>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                Tokens with role: 'admin' are enforced server-side. Standard users are denied access to admin endpoints.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 2. Operations & Maintenance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-6 space-y-5 hover:border-indigo-500/20 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Platform Operations</h2>
              <p className="text-[10px] text-slate-400">System maintenance and automated approval rules</p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/4">
              <div>
                <p className="font-bold text-white">Maintenance Mode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Show maintenance screen to non-admin traders.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('maintenanceMode')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.maintenanceMode ? 'bg-rose-600' : 'bg-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/4">
              <div>
                <p className="font-bold text-white">Auto-Flag Drawdown Breaches</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Lock accounts when daily or max drawdown is violated.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('strictDrawdownFlagging')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.strictDrawdownFlagging ? 'bg-emerald-600' : 'bg-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.strictDrawdownFlagging ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/2 border border-white/4">
              <div>
                <p className="font-bold text-white">Auto-Approve Verified Payouts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Automatically approve payout requests under $1,000.</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('autoApprovePayouts')}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  settings.autoApprovePayouts ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoApprovePayouts ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 3. Challenge Rules & Risk Controls */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-6 space-y-5 hover:border-indigo-500/20 transition-all md:col-span-2"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Default Prop Firm Risk Parameters</h2>
              <p className="text-[10px] text-slate-400">Baseline thresholds applied to newly created trader evaluations</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white/2 border border-white/4 space-y-2">
              <label className="font-bold text-white">Daily Drawdown Limit (%)</label>
              <input
                type="number"
                value={settings.maxDailyDrawdownPct}
                onChange={(e) => handleNumberChange('maxDailyDrawdownPct', Number(e.target.value))}
                className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Max allowed equity decline within 24h</p>
            </div>

            <div className="p-4 rounded-xl bg-white/2 border border-white/4 space-y-2">
              <label className="font-bold text-white">Max Total Drawdown (%)</label>
              <input
                type="number"
                value={settings.maxOverallDrawdownPct}
                onChange={(e) => handleNumberChange('maxOverallDrawdownPct', Number(e.target.value))}
                className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Overall account equity floor breach</p>
            </div>

            <div className="p-4 rounded-xl bg-white/2 border border-white/4 space-y-2">
              <label className="font-bold text-white">Profit Target (%)</label>
              <input
                type="number"
                value={settings.defaultProfitTargetPct}
                onChange={(e) => handleNumberChange('defaultProfitTargetPct', Number(e.target.value))}
                className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500">Target to qualify for funded status</p>
            </div>
          </div>
        </motion.div>

        {/* 4. Subscription Pricing */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="rounded-2xl bg-[#0D1120] border border-white/6 p-6 space-y-5 hover:border-amber-500/20 transition-all md:col-span-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Subscription Plans &amp; Pricing</h2>
                <p className="text-[10px] text-slate-400">Manage monthly &amp; annual prices for Pro and Premium plans shown to traders</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {pricingSaved && (
                <motion.span
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Pricing saved &amp; live!
                </motion.span>
              )}
              {pricingError && (
                <span className="text-xs font-bold text-rose-400 max-w-xs">{pricingError}</span>
              )}
              <button
                onClick={handleSavePricing}
                disabled={pricingSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow-lg shadow-amber-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {pricingSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{pricingSaving ? 'Saving...' : 'Save Pricing Changes'}</span>
              </button>
            </div>
          </div>

          {/* Plan pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLAN_META.map(({ key, label, badge, border, color }) => (
              <div
                key={key}
                className={`rounded-xl border ${border} bg-white/2 p-4 space-y-3 hover:bg-white/4 transition-all`}
              >
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badge}`}>
                    {label}
                  </span>
                  {key === 'Pro' && (
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  )}
                </div>

                {/* Monthly Price Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monthly Price ($/mo)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing[key]?.monthly ?? 0}
                      onChange={e => handlePriceChange(key, 'monthly', e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 bg-white/4 border border-white/8 rounded-xl text-white text-sm font-bold font-mono focus:outline-none focus:${border} transition-all`}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Annual Price Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Annual Price ($/yr)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pricing[key]?.annual ?? 0}
                      onChange={e => handlePriceChange(key, 'annual', e.target.value)}
                      className={`w-full pl-7 pr-3 py-2 bg-white/4 border border-white/8 rounded-xl text-white text-sm font-bold font-mono focus:outline-none focus:${border} transition-all`}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    ≈ ${((pricing[key]?.annual ?? 0) / 12).toFixed(2)}/mo billed annually
                  </p>
                </div>

                {/* Features Summary */}
                <div className="pt-2 border-t border-white/4 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300 text-[10px] uppercase tracking-wider">Features Included:</p>
                  <ul className="space-y-1 pl-1">
                    {pricing[key]?.features?.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-white/2 border border-white/6 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Preview — What traders see on Home page</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAN_META.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/4">
                  <span className={`text-xs font-bold ${color}`}>{label}</span>
                  <div className="text-right">
                    <span className="text-white text-sm font-black">${pricing[key]?.monthly ?? 0}</span>
                    <span className="text-slate-400 text-[10px]">/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Prices configured here are saved to the backend database and shared store. The public landing page and trader subscription dashboard will update immediately.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
