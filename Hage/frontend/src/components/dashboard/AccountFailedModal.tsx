import { 
  ShieldAlert, AlertTriangle, Plus, X, Building2, Calendar, DollarSign
} from 'lucide-react';
import { type Campaign } from '../../store/useTradeStore';
import { format } from 'date-fns';

interface AccountFailedModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onConnectNew: () => void;
}

export function AccountFailedModal({
  campaign,
  isOpen,
  onClose,
  onConnectNew
}: AccountFailedModalProps) {
  if (!isOpen || !campaign) return null;

  const failedDateFormatted = campaign.failedDate 
    ? format(new Date(campaign.failedDate), 'MMMM d, yyyy, h:mm a') 
    : format(new Date(), 'MMMM d, yyyy');

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-[#111722] rounded-2xl w-full max-w-lg shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 bg-rose-50/80 dark:bg-rose-950/40 border-b border-rose-200/60 dark:border-rose-900/40">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="tracking-wide uppercase text-xs font-black">Official Notice • Account Closed</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg hover:bg-gray-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 mx-auto flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              ACCOUNT FAILED
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium">
              Your account reached the configured risk rule limit.
            </p>
          </div>

          {/* Key Account Information */}
          <div className="text-left p-4 rounded-xl bg-gray-50 dark:bg-[#182030] border border-gray-200/60 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-gray-200/40 dark:border-slate-700/40">
              <span className="text-gray-400 font-semibold">Account</span>
              <span className="font-bold text-gray-900 dark:text-white">{campaign.name} (#{campaign.accountNumber})</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-200/40 dark:border-slate-700/40">
              <span className="text-gray-400 font-semibold">Prop Firm</span>
              <span className="font-bold text-gray-900 dark:text-white">{campaign.broker}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-200/40 dark:border-slate-700/40">
              <span className="text-gray-400 font-semibold">Account Size</span>
              <span className="font-bold text-gray-900 dark:text-white">${campaign.accountSize.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-200/40 dark:border-slate-700/40">
              <span className="text-gray-400 font-semibold">Phase</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{campaign.phase}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-gray-200/40 dark:border-slate-700/40">
              <span className="text-gray-400 font-semibold">Date Failed</span>
              <span className="font-bold text-gray-900 dark:text-white">{failedDateFormatted}</span>
            </div>
            <div className="pt-1">
              <span className="text-gray-400 font-semibold block mb-0.5">Failure Reason</span>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium leading-relaxed p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
                {campaign.failureReason || `Exceeded maximum drawdown rule limit of $${(campaign.maxDrawdown || 0).toLocaleString()}.`}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 dark:text-slate-400">
            This account is locked and permanently preserved in Failed Accounts history for trade review and discipline analysis.
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onConnectNew();
              }}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Connect New Account</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-3 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Close & View History
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
