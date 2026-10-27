import { 
  Building2, 
  Wallet, 
  DollarSign, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';
import { useTradeStore } from '../../store/useTradeStore';

export function CompactActiveAccountCard() {
  const { campaigns, activeCampaignId } = useTradeStore();

  // Show ONLY ONE active account on the Dashboard (the currently selected active account)
  const targetId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const campaign = campaigns.find(c => c.id === targetId) || (campaigns.length > 0 ? campaigns[0] : null);

  if (!campaign) {
    return (
      <Card className="w-full max-w-md border border-gray-200/80 dark:border-[#1E293B] rounded-2xl shadow-xs bg-white/80 dark:bg-[#111722]/85 backdrop-blur-md">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-500 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">No Active Account</h4>
              <p className="text-[11px] text-gray-400">Connect an account in Account Management.</p>
            </div>
          </div>
          <Link
            to="/dashboard/campaigns"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
          >
            Connect
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Real calculations
  const startingBalance = campaign.startingBalance || campaign.accountSize;
  const currentBalance = campaign.currentBalance;
  const totalPnl = currentBalance - startingBalance;
  const pnlPercent = startingBalance > 0 ? (totalPnl / startingBalance) * 100 : 0;

  // Account Type formatting
  const isReal = campaign.phase === 'Real Account';
  const isFunded = campaign.phase === 'Funded';
  const accountTypeLabel = isReal 
    ? 'Real Account' 
    : isFunded 
    ? 'Funded Account' 
    : `Challenge (${campaign.phase})`;

  return (
    <Card className="w-full max-w-lg border border-gray-200/80 dark:border-[#1E293B] rounded-2xl shadow-xs bg-white/80 dark:bg-[#111722]/85 backdrop-blur-md hover:shadow-md transition-all duration-200">
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        
        {/* Card Header: Title + Active Status + Manage Link */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
              Active Account
            </span>
            <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[170px]">
              {campaign.name}
            </span>
          </div>

          <Link
            to="/dashboard/campaigns"
            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
            title="Manage all accounts in Account Management"
          >
            <span>Accounts</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* 6 Essential Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
          
          {/* 1. Prop Firm / Broker */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              Broker / Firm
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isReal ? (
                <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              ) : isFunded ? (
                <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
              <span className="font-extrabold text-gray-900 dark:text-white truncate">
                {campaign.broker}
              </span>
            </div>
          </div>

          {/* 2. Account Type */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              Account Type
            </span>
            <span className={`inline-block font-extrabold mt-0.5 truncate ${
              isReal 
                ? 'text-purple-600 dark:text-purple-400' 
                : isFunded 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : 'text-blue-600 dark:text-blue-400'
            }`}>
              {accountTypeLabel}
            </span>
          </div>

          {/* 3. Account Size / Equity */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              {isReal ? 'Equity' : 'Account Size'}
            </span>
            <span className="font-extrabold text-gray-900 dark:text-white font-mono mt-0.5 block">
              ${(isReal ? currentBalance : campaign.accountSize).toLocaleString(undefined, { minimumFractionDigits: isReal ? 2 : 0, maximumFractionDigits: isReal ? 2 : 0 })}
            </span>
          </div>

          {/* 4. Current Balance */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              Balance
            </span>
            <span className="font-extrabold text-gray-900 dark:text-white font-mono mt-0.5 block">
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* 5. Current P&L */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              Net P&L
            </span>
            <span className={`font-black font-mono mt-0.5 block ${
              totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              <span className="text-[10px] font-semibold ml-1">
                ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)
              </span>
            </span>
          </div>

          {/* 6. Account Status */}
          <div className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">
              Account Status
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {isReal ? (
                currentBalance <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Paused ($0)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border-purple-200/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Live Trading
                  </span>
                )
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                  campaign.status === 'Passed'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                    : campaign.status === 'Failed'
                    ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border-rose-200/60'
                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border-blue-200/60'
                }`}>
                  <CheckCircle2 className="w-3 h-3" />
                  {campaign.status === 'Passed'
                    ? 'PASSED • Read-only'
                    : campaign.status === 'Failed'
                    ? 'FAILED • Closed'
                    : 'Active'}
                </span>
              )}
            </div>
          </div>

        </div>

      </CardContent>
    </Card>
  );
}
