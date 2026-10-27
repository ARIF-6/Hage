import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, Wallet, DollarSign, Target, Plus, 
  Lock, AlertTriangle, CheckCircle2, ChevronDown, 
  TrendingUp, TrendingDown, Layers, ShieldCheck, ShieldAlert
} from 'lucide-react';
import { TradeTable } from '../../components/dashboard/TradeTable';
import { RiskAndGoals } from '../../components/dashboard/RiskAndGoals';
import { AddTradeModal } from '../../components/ui/AddTradeModal';
import { Card, CardContent } from '../../components/ui/Card';
import { useTradeStore } from '../../store/useTradeStore';
import { format } from 'date-fns';

export default function Trades() {
  const { trades, campaigns, activeCampaignId, setActiveCampaign } = useTradeStore();
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);

  // Active account selection
  const selectedCampaignId = activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || campaigns[0];

  // Trades strictly for the currently selected active account
  const accountTrades = useMemo(() => {
    if (!selectedCampaign) return [];
    return trades.filter(t => t.campaignId === selectedCampaign.id);
  }, [trades, selectedCampaign]);

  const isPassed = selectedCampaign?.status === 'Passed';
  const isFailed = selectedCampaign?.status === 'Failed';
  const isLocked = isPassed || isFailed;

  const isReal = selectedCampaign?.phase === 'Real Account';
  const isFunded = selectedCampaign?.phase === 'Funded';
  const isChallenge = !isReal && !isFunded;

  const startingBalance = selectedCampaign ? (selectedCampaign.startingBalance || selectedCampaign.accountSize) : 100000;
  const currentBalance = selectedCampaign ? selectedCampaign.currentBalance : startingBalance;
  const netPnl = currentBalance - startingBalance;
  const pnlPercent = startingBalance > 0 ? (netPnl / startingBalance) * 100 : 0;

  // Prop Firm Challenge Metrics
  const targetRequired = selectedCampaign?.profitTarget || (startingBalance * ((selectedCampaign?.profitTargetPercent || 8) / 100));
  const profitTargetProgress = isChallenge && targetRequired > 0 
    ? Math.max(0, Math.min(100, (netPnl / targetRequired) * 100)) 
    : 100;

  // Daily Drawdown calculation for active account
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTrades = accountTrades.filter(t => {
    try {
      return format(new Date(t.date), 'yyyy-MM-dd') === todayStr;
    } catch {
      return t.date.startsWith(todayStr);
    }
  });
  const todaysPnl = todaysTrades.reduce((sum, t) => sum + t.pnl, 0);
  const dailyDrawdownAmount = -todaysPnl;
  const maxDailyLimit = selectedCampaign?.maxDailyDrawdown || (startingBalance * 0.05);

  // Max Drawdown calculation
  const totalDrawdownAmount = -netPnl;
  const maxDrawdownLimit = selectedCampaign?.maxDrawdown || (startingBalance * 0.10);

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        
        {/* Top Header: Title, Active Account Switcher & Add Trade Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-7 h-7 text-primary dark:text-blue-400" />
              Trades & Risk Control
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Active account trade execution log, real-time risk parameters, and consistency goals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Account Switcher Dropdown */}
            {campaigns.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCampaign?.id || ''}
                  onChange={(e) => setActiveCampaign(e.target.value)}
                  className="appearance-none bg-gray-100 dark:bg-[#182030] hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-900 dark:text-white font-bold text-xs sm:text-sm px-4 py-2.5 pr-9 rounded-xl border border-gray-200/80 dark:border-slate-700 cursor-pointer transition-all shadow-xs"
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phase}) {c.status !== 'Active' ? `[${c.status}]` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Add Trade Button */}
            <button
              onClick={() => setIsAddTradeOpen(true)}
              disabled={isLocked}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                isLocked
                  ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
              }`}
              title={isLocked ? 'Account is locked (Read-only). No new trades permitted.' : 'Add trade'}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isLocked ? 'Account Locked' : 'Add Trade'}</span>
            </button>
          </div>
        </div>

        {/* LOCKED ACCOUNT BANNER IF PASSED OR FAILED */}
        {isPassed && (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2.5 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>PASSED EVALUATION • This account is locked (Read-only). Profit target was achieved and further trading activity is stopped.</span>
            </div>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 shrink-0">
              Read-Only
            </span>
          </div>
        )}

        {isFailed && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center justify-between text-xs sm:text-sm text-rose-800 dark:text-rose-300">
            <div className="flex items-center gap-2.5 font-bold">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
              <span>ACCOUNT FAILED • {selectedCampaign?.failureReason || 'Account reached configured maximum drawdown.'} Trading is permanently locked.</span>
            </div>
            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 shrink-0">
              Closed
            </span>
          </div>
        )}

        {/* 1. COMPACT ACCOUNT SUMMARY (TOP OF TRADES PAGE) */}
        {selectedCampaign && (
          <Card className="shadow-xs border border-gray-200/80 dark:border-[#1E293B] bg-white/80 dark:bg-[#111722]/80 backdrop-blur-md">
            <CardContent className="p-4 sm:p-5 space-y-4">
              
              {/* Summary Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-[#1E293B]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-500">
                    {isReal ? <Wallet className="w-4 h-4 text-purple-500" /> : isFunded ? <DollarSign className="w-4 h-4 text-emerald-500" /> : <Building2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                        {selectedCampaign.name}
                      </h3>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                        isPassed 
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/60 text-emerald-600 dark:text-emerald-400'
                          : isFailed
                          ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/60 text-rose-600 dark:text-rose-400'
                          : isReal
                          ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-200/60 text-purple-600 dark:text-purple-400'
                          : isFunded
                          ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-blue-50 dark:bg-blue-950/70 border-blue-200/60 text-blue-600 dark:text-blue-400'
                      }`}>
                        {selectedCampaign.phase}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium">
                      {selectedCampaign.broker} • #{selectedCampaign.accountNumber} • {selectedCampaign.platform}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">Account Trades:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-[#182030] text-gray-900 dark:text-white text-xs font-black">
                    {accountTrades.length}
                  </span>
                </div>
              </div>

              {/* Core Financial Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                
                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Starting Balance
                  </span>
                  <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 block">
                    ${startingBalance.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Current Balance
                  </span>
                  <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5 block">
                    ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Net P&L
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {netPnl >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span className={`text-base sm:text-lg font-black ${
                      netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {netPnl >= 0 ? '+' : '-'}${Math.abs(netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Percentage Return
                  </span>
                  <span className={`text-base sm:text-lg font-black mt-0.5 block ${
                    pnlPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                  </span>
                </div>

              </div>

              {/* PROP FIRM SPECIFIC CHALLENGE RULES (DO NOT SHOW FOR REAL ACCOUNTS) */}
              {!isReal && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-[#1E293B] text-xs">
                  
                  {/* Profit Target Progress */}
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        Profit Target Progress
                      </span>
                      <span className="text-[10px] font-extrabold text-blue-800 dark:text-blue-200">
                        {isFunded ? 'Funded Capital' : `${profitTargetProgress.toFixed(1)}%`}
                      </span>
                    </div>
                    {isChallenge && (
                      <>
                        <div className="w-full bg-blue-100 dark:bg-blue-900/40 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${profitTargetProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                          <span>Progress: ${Math.max(0, netPnl).toLocaleString()}</span>
                          <span>Target: ${targetRequired.toLocaleString()} ({selectedCampaign.profitTargetPercent || 8}%)</span>
                        </div>
                      </>
                    )}
                    {isFunded && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        Live capital account. Eligible for profit split withdrawals.
                      </p>
                    )}
                  </div>

                  {/* Daily Drawdown */}
                  <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Daily Drawdown
                      </span>
                      <span className={`text-[10px] font-bold ${dailyDrawdownAmount > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                        {dailyDrawdownAmount > 0 ? `-$${dailyDrawdownAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          dailyDrawdownAmount > maxDailyLimit * 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (dailyDrawdownAmount / maxDailyLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                      <span>Today's loss limit: ${maxDailyLimit.toLocaleString()}</span>
                      <span>Remaining: ${Math.max(0, maxDailyLimit - dailyDrawdownAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Maximum Drawdown */}
                  <div className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#182030]/60 border border-gray-200/50 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Maximum Drawdown
                      </span>
                      <span className={`text-[10px] font-bold ${totalDrawdownAmount > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                        {totalDrawdownAmount > 0 ? `-$${totalDrawdownAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '$0.00'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          totalDrawdownAmount > maxDrawdownLimit * 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (totalDrawdownAmount / maxDrawdownLimit) * 100))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-slate-400">
                      <span>Max loss rule: ${maxDrawdownLimit.toLocaleString()}</span>
                      <span>Remaining: ${Math.max(0, maxDrawdownLimit - totalDrawdownAmount).toLocaleString()}</span>
                    </div>
                  </div>

                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* 3. TRADE TABLE: STRICTLY ACTIVE ACCOUNT ONLY */}
        <TradeTable campaignId={selectedCampaign?.id} />

        {/* 2. RISK MANAGEMENT + TRADING GOALS & CONSISTENCY (BELOW TRADE TABLE) */}
        <RiskAndGoals
          trades={accountTrades}
          startingBalance={startingBalance}
        />

      </motion.div>

      {/* Add Trade Modal */}
      <AddTradeModal 
        isOpen={isAddTradeOpen} 
        onClose={() => setIsAddTradeOpen(false)} 
      />
    </div>
  );
}
