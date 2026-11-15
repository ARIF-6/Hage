import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Sparkles, Crown, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { setUserPlan, type PlanType } from '../../store/subscriptionRules';
import { loadPlanPricing } from '../../store/pricingStore';

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan?: PlanType;
  title?: string;
  reason?: string;
  onUpgraded?: () => void;
}

export function UpgradeModal({
  isOpen,
  onClose,
  targetPlan = 'Pro',
  title,
  reason,
  onUpgraded
}: UpgradeModalProps) {
  const navigate = useNavigate();
  const pricing = loadPlanPricing();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(targetPlan || 'Pro');

  useEffect(() => {
    if (targetPlan) {
      setSelectedPlan(targetPlan);
    }
  }, [targetPlan, isOpen]);

  if (!isOpen) return null;

  const ALL_PLANS = [
    {
      key: 'Starter' as PlanType,
      name: 'Starter',
      duration: '1 Month',
      price: pricing.Starter?.monthly ?? 2.99,
      accounts: '2 Accounts',
      badge: null,
      icon: Zap,
      features: [
        'Up to 2 Trading Accounts',
        'Unlimited Trades',
        'Advanced Analytics',
        'Challenge Tracking & Phases',
      ],
    },
    {
      key: 'Pro' as PlanType,
      name: 'Pro',
      duration: '3 Months',
      price: pricing.Pro?.monthly ?? 4.99,
      accounts: '10 Accounts',
      badge: 'Popular',
      icon: Sparkles,
      features: [
        'Up to 10 Trading Accounts',
        'Unlimited Trades',
        'Advanced Analytics',
        'Challenge Tracking & Phases',
      ],
    },
    {
      key: 'Premium' as PlanType,
      name: 'Premium',
      duration: '6 Months',
      price: pricing.Premium?.monthly ?? 9.99,
      accounts: 'Unlimited Accounts',
      badge: 'Best Value',
      icon: Crown,
      features: [
        'Unlimited Trading Accounts',
        'Unlimited Trades',
        'Advanced Analytics',
        'Priority Support & Features',
      ],
    },
  ];

  const currentSelected = ALL_PLANS.find(p => p.key === selectedPlan) || ALL_PLANS[1];

  const handleUpgradeNow = () => {
    setUserPlan(selectedPlan);
    if (onUpgraded) onUpgraded();
    onClose();
    navigate(`/dashboard/subscription?plan=${selectedPlan.toLowerCase()}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0D1120] border border-blue-500/30 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden relative"
        >
          {/* Top banner accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Header badge & title */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                {selectedPlan === 'Premium' ? (
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>{selectedPlan} Membership</span>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {title || 'Choose Your Plan'}
              </h2>

              <p className="text-xs text-slate-400">
                Compare all 3 pricing tiers and choose the membership that fits your trading
              </p>

              {reason && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed font-medium">
                  {reason}
                </div>
              )}
            </div>

            {/* The 3 Pricing Parts / Plans Grid */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Membership Plans (3 Tiers):
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {ALL_PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.key;
                  const IconComponent = plan.icon;
                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => setSelectedPlan(plan.key)}
                      className={`relative p-3 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between border ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                          : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                      }`}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500 text-white shadow-xs">
                          {plan.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <IconComponent className={`w-3.5 h-3.5 ${
                            plan.key === 'Premium' ? 'text-amber-400' : 'text-blue-400'
                          }`} />
                          <span className="text-xs font-bold text-white">{plan.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">{plan.duration}</span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-black text-white">${plan.price.toFixed(2)}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium block truncate mt-0.5">
                          {plan.accounts}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Features list of the currently selected plan */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Included in {selectedPlan} (${currentSelected.price.toFixed(2)}):
                </p>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {currentSelected.accounts}
                </span>
              </div>
              <ul className="space-y-2">
                {currentSelected.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-blue-400" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Upgrade Button */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={handleUpgradeNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-extrabold text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Select {selectedPlan} — ${currentSelected.price.toFixed(2)}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-1 text-center text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
