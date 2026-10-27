import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, AlertTriangle, ArrowRight, X, Eye, 
  CheckCircle2, Ban, Clock, Sparkles
} from 'lucide-react';
import { getSubscriptionStatus } from '../../store/subscriptionRules';

interface SubscriptionExpiredModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  actionName?: string;
}

export function SubscriptionExpiredModal({
  isOpen: propsIsOpen,
  onClose: propsOnClose,
  actionName: propsActionName,
}: SubscriptionExpiredModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const navigate = useNavigate();
  const subStatus = getSubscriptionStatus();

  useEffect(() => {
    const handleBlocked = (e: any) => {
      const action = e.detail?.actionName || 'modify dashboard data';
      setCurrentAction(action);
      setInternalOpen(true);
    };

    window.addEventListener('subscriptionExpiredActionBlocked', handleBlocked);
    return () => {
      window.removeEventListener('subscriptionExpiredActionBlocked', handleBlocked);
    };
  }, []);

  const isVisible = propsIsOpen !== undefined ? propsIsOpen : internalOpen;
  const activeActionName = propsActionName || currentAction;

  const handleClose = () => {
    setInternalOpen(false);
    if (propsOnClose) propsOnClose();
  };

  const handleRenew = () => {
    handleClose();
    navigate('/dashboard/subscription');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-[#0E131F] border border-amber-500/40 dark:border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10 dark:shadow-black/70 overflow-hidden relative"
          >
            {/* Top gradient glow line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

            {/* Modal Header */}
            <div className="p-5 pb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 dark:bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-inner">
                  <Lock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                      Subscription Ended
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      Read-Only Mode
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Your {subStatus.planName || '1-Month'} subscription has expired.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Blocked Notice Banner */}
            {activeActionName && (
              <div className="mx-5 mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Action Locked: </span>
                  You cannot <span className="underline font-semibold">{activeActionName}</span> while your subscription is expired. Dashboard changes are restricted to read-only.
                </div>
              </div>
            )}

            {/* Content Body */}
            <div className="px-5 space-y-4 text-xs">
              <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                When your subscription month ends, all previous data remains completely safe. You have full read-only access to inspect your charts, analytics, and journal history, but creating new records or managing accounts is paused until renewal.
              </p>

              {/* Permission Matrix Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-500/8 dark:bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Allowed (Read-Only)</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>View trade charts &amp; P&amp;L</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Review analytics history</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Browse past payout records</span>
                    </li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-rose-500/8 dark:bg-rose-500/5 border border-rose-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] uppercase tracking-wider">
                    <Ban className="w-3.5 h-3.5" />
                    <span>Locked (Paused)</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-gray-600 dark:text-slate-400">
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Adding / logging trades</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Connecting new accounts</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>Requesting new payouts</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 mt-2 bg-gray-50/70 dark:bg-white/2 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-center cursor-pointer"
              >
                Continue Browsing (Read-Only)
              </button>

              <button
                type="button"
                onClick={handleRenew}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Renew Subscription Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
