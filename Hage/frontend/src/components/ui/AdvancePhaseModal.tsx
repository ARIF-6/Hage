import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Award, ArrowRight, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTradeStore, type Campaign } from '../../store/useTradeStore';

interface AdvancePhaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

const PHASE_2_TARGET_PRESETS = [4, 5, 6, 8];

export function AdvancePhaseModal({ isOpen, onClose, campaign }: AdvancePhaseModalProps) {
  const { advanceCampaign } = useTradeStore();
  const [phase2TargetPct, setPhase2TargetPct] = useState('5'); // default 5% for Phase 2

  if (!isOpen || !campaign) return null;

  const isPhase1 = campaign.phase === 'Phase 1';
  const isPhase2 = campaign.phase === 'Phase 2';

  const originalSize = campaign.accountSize;
  const parsedTargetPct = parseFloat(phase2TargetPct) || 5;
  const phase2DollarTarget = Math.round(originalSize * (parsedTargetPct / 100));

  const handleConfirm = () => {
    if (isPhase1) {
      advanceCampaign(campaign.id, {
        phase2TargetPercent: parsedTargetPct,
        phase2TargetAmount: phase2DollarTarget
      });
    } else if (isPhase2) {
      advanceCampaign(campaign.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#111722] border border-gray-200 dark:border-[#1E293B] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                isPhase1 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-blue-500/10 text-blue-500'
              }`}>
                {isPhase1 ? <Sparkles className="w-5 h-5" /> : <Award className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Target Reached
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {isPhase1 ? 'Congratulations! You reached your Profit Target.' : 'Congratulations! You passed the challenge and are now Funded.'}
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Transition Explanation */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-slate-400">Completed Challenge:</span>
              <span className="font-bold text-gray-900 dark:text-white">{campaign.name} ({campaign.phase})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-slate-400">Preserved In:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PASSED ACCOUNTS (History intact)
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-slate-800 font-semibold">
              <span className="text-gray-700 dark:text-slate-300">
                New {isPhase1 ? 'Phase 2' : 'Funded'} Starting Balance:
              </span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                ${originalSize.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-normal">
              * Starts cleanly from your original account size ($ {originalSize.toLocaleString()}), NOT previous challenge earnings.
            </p>
          </div>

          {/* Phase 1 -> Phase 2 Specific Target Configuration */}
          {isPhase1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Select Phase 2 Profit Target %
                </label>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  +${phase2DollarTarget.toLocaleString()} profit target
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min="1"
                  max="30"
                  step="0.5"
                  value={phase2TargetPct}
                  onChange={e => setPhase2TargetPct(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-[#182030] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>

              <div className="flex items-center gap-2">
                {PHASE_2_TARGET_PRESETS.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPhase2TargetPct(pct.toString())}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                      parsedTargetPct === pct
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 dark:bg-[#182030] text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                Different prop firms use 4%, 5%, or 6% for Phase 2 verification. Enter your firm's exact rule.
              </p>
            </div>
          )}

          {/* Phase 2 -> Funded Specific Note */}
          {isPhase2 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Evaluation Passed & Verification Complete</span>
              </div>
              <p className="text-gray-600 dark:text-slate-400 leading-relaxed text-[11px]">
                Your Funded account will be activated with a starting balance of ${originalSize.toLocaleString()}. You can trade this account and request profit payouts from the Payouts tab.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>{isPhase1 ? 'Start Phase 2 Challenge' : 'Activate Funded Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
