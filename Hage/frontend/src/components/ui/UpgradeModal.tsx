import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Sparkles, Crown, Zap, Shield, ArrowRight } from 'lucide-react';
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

  if (!isOpen) return null;

  const priceAmount = targetPlan === 'Premium' 
    ? pricing.Premium.monthly 
    : targetPlan === 'Pro'
    ? pricing.Pro.monthly
    : (pricing.Starter?.monthly ?? 2.99);

  const features = targetPlan === 'Premium' ? [
    'Everything in Pro',
    'Unlimited Trading Accounts',
    'Unlimited Trades',
    'MT5 Integration',
    'AI Trade Analysis & Scoring'
  ] : targetPlan === 'Pro' ? [
    'Up to 10 Trading Accounts',
    'Unlimited Trades',
    'Advanced Analytics',
    'Challenge Tracking & Phases'
  ] : [
    'Up to 2 Trading Accounts',
    'Unlimited Trades',
    'Advanced Analytics',
    'Challenge Tracking & Phases'
  ];

  const handleUpgradeNow = () => {
    setUserPlan(targetPlan);
    if (onUpgraded) onUpgraded();
    onClose();
    navigate(`/dashboard/subscription?plan=${targetPlan}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-[#0D1120] border border-blue-500/30 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative"
        >
          {/* Top banner accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-7 space-y-6">
            {/* Header badge & title */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">
                {targetPlan === 'Premium' ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                <span>{targetPlan} Membership</span>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {title || (targetPlan === 'Premium' ? 'Unlock Unlimited Trading' : 'Upgrade to Pro')}
              </h2>

              {reason && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed font-medium">
                  {reason}
                </div>
              )}
            </div>

            {/* Price Preview */}
            <div className="p-4 rounded-2xl bg-white/2 border border-white/6 flex items-baseline justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Starting at only</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-white">${priceAmount}</span>
                  <span className="text-slate-400 text-xs">/month</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Cancel Anytime
              </span>
            </div>

            {/* Features list matching user's screenshot */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                What you get with {targetPlan}:
              </p>
              <ul className="space-y-2.5">
                {features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                    <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Upgrade Button */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleUpgradeNow}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-extrabold text-sm transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Upgrade to {targetPlan}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 text-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
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
