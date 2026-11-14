import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, ArrowUpRight, DollarSign, Plus, Wallet, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useTradeStore } from '../../store/useTradeStore';
import { AdvancePhaseModal } from '../ui/AdvancePhaseModal';
import { AddCampaignModal } from '../ui/AddCampaignModal';
import { format } from 'date-fns';

interface ChallengeCardProps {
  campaignId?: string;
  onConnectNew?: () => void;
}

export function ChallengeCard({ campaignId, onConnectNew }: ChallengeCardProps) {
  const { campaigns, trades, activeCampaignId, failCampaign, setCertificateModalCampaign, setActiveCampaign } = useTradeStore();
  const navigate = useNavigate();
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const targetId = campaignId || activeCampaignId || (campaigns.length > 0 ? campaigns[0].id : null);
  const campaign = campaigns.find(c => c.id === targetId) || campaigns[0];

  if (!campaign) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-gray-400 dark:text-slate-400">
          <Award className="w-8 h-8 mx-auto text-gray-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold">No active campaign selected.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate today's PNL
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysTrades = trades.filter(t => {
    if (t.campaignId !== campaign.id) return false;
    try {
      return format(new Date(t.date), 'yyyy-MM-dd') === todayStr;
    } catch {
      return t.date.startsWith(todayStr);
    }
  });
  const todaysPnl = todaysTrades.reduce((sum, t) => sum + t.pnl, 0);

  // Total PNL & Profit Target calculations
  const totalPnl = campaign.currentBalance - campaign.startingBalance;
  const targetAmount = campaign.profitTarget || 1;
  const isFunded = campaign.phase === 'Funded';
  const isReal = campaign.phase === 'Real Account';
  const isChallenge = !isFunded && !isReal;
  
  const profitProgress = !isChallenge ? 100 : Math.max(0, Math.min(100, (totalPnl / targetAmount) * 100));
  const profitNeeded = Math.max(0, (campaign.profitTarget || 0) - totalPnl);
  const isTargetReached = isChallenge && campaign.status === 'Active' && totalPnl >= (campaign.profitTarget || 1);

  // Daily Loss Limit calculations
  const dailyDrawdown = -todaysPnl; 
  const dailyLossProgress = dailyDrawdown > 0 ? Math.min(100, (dailyDrawdown / (campaign.maxDailyDrawdown || 1)) * 100) : 0;
  const dailyLimitRemaining = (campaign.maxDailyDrawdown || 0) - dailyDrawdown;
  const isDailyLossBreached = dailyDrawdown >= (campaign.maxDailyDrawdown || 1);

  // Max Loss Limit calculations
  const maxDrawdown = -totalPnl;
  const maxLossProgress = maxDrawdown > 0 ? Math.min(100, (maxDrawdown / (campaign.maxDrawdown || 1)) * 100) : 0;
  const maxLimitRemaining = (campaign.maxDrawdown || 0) - maxDrawdown;
  const isMaxDrawdownBreached = maxDrawdown >= (campaign.maxDrawdown || 1);

  const isFailed = campaign.status === 'Failed' || isMaxDrawdownBreached || isDailyLossBreached;
  const failureReason = campaign.failureReason || (
    isMaxDrawdownBreached 
      ? `Maximum drawdown limit of $${(campaign.maxDrawdown || 0).toLocaleString()} breached (Drawdown: -$${Math.abs(maxDrawdown).toLocaleString(undefined, { minimumFractionDigits: 2 })}).`
      : isDailyLossBreached 
      ? `Daily loss limit of $${(campaign.maxDailyDrawdown || 0).toLocaleString()} breached.`
      : 'Account failed rules.'
  );

  const handleOpenConnect = () => {
    if (onConnectNew) {
      onConnectNew();
    } else {
      setIsAddModalOpen(true);
    }
  };

  const handleMarkFailed = () => {
    failCampaign(campaign.id, failureReason);
  };

  return (
    <>
      <Card className={`shadow-sm transition-all duration-200 ${
        campaign.status === 'Failed' || isFailed 
          ? 'border-rose-300 dark:border-rose-900/60' 
          : campaign.status === 'Passed' 
          ? 'border-emerald-300 dark:border-emerald-900/60'
          : ''
      }`}>
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-[#1E293B]">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border ${
                  campaign.status === 'Passed'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                    : campaign.status === 'Failed' || isFailed
                    ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200/60 dark:border-rose-800/60 text-rose-600 dark:text-rose-400'
                    : isReal
                    ? 'bg-purple-50 dark:bg-purple-950/70 border-purple-200/60 dark:border-purple-800/60 text-purple-600 dark:text-purple-400'
                    : isFunded
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200/60 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-50 dark:bg-blue-950/70 border-blue-200/60 dark:border-blue-800/60 text-blue-600 dark:text-blue-400'
                }`}>
                  {campaign.status === 'Passed' 
                    ? 'PASSED • Read-only account' 
                    : campaign.status === 'Failed' || isFailed 
                    ? 'FAILED • Account closed' 
                    : campaign.phase}
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-400">•</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">{campaign.broker}</span>
              </div>
              <CardTitle className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {campaign.name}
              </CardTitle>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#182030] border border-gray-200/50 dark:border-slate-800 flex items-center justify-center">
              {campaign.status === 'Passed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : campaign.status === 'Failed' || isFailed ? (
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              ) : isReal ? (
                <Wallet className="w-4 h-4 text-purple-500" />
              ) : isFunded ? (
                <DollarSign className="w-4 h-4 text-emerald-500" />
              ) : (
                <Award className="w-4 h-4 text-blue-500" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-3 pb-4 space-y-4">

          {/* 1. PROFIT TARGET WORKFLOW NOTIFICATION: PHASE 1 REACHED TARGET */}
          {isTargetReached && campaign.phase === 'Phase 1' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Congratulations! You reached your Profit Target.</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                You achieved the Phase 1 target (+${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Ready to advance to Phase 2.
              </p>
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Advance to Phase 2</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 2. PROFIT TARGET WORKFLOW NOTIFICATION: PHASE 2 REACHED TARGET */}
          {isTargetReached && campaign.phase === 'Phase 2' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs sm:text-sm">
                <Award className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Congratulations! You passed the challenge and are now Funded.</span>
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                Your evaluation challenge is officially passed. Activate your live Funded account to start trading real capital.
              </p>
              <button
                onClick={() => setIsAdvanceModalOpen(true)}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Activate Funded Account</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 3. FAILED WORKFLOW NOTIFICATION */}
          {(campaign.status === 'Failed' || isFailed) && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>FAILED — Account closed</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 uppercase">
                  Read-only
                </span>
              </div>
              <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 font-medium">
                Reason: {failureReason}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                This account is historical and read-only. No further trades or balance changes are permitted.
              </p>
              {campaign.status !== 'Failed' && (
                <button
                  onClick={handleMarkFailed}
                  className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Confirm & Move to Failed Accounts
                </button>
              )}
              <button
                onClick={handleOpenConnect}
                className="w-full py-2 px-3 bg-gray-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect New Account</span>
              </button>
            </div>
          )}

          {/* 4. PASSED ACCOUNT ARCHIVED NOTICE */}
          {campaign.status === 'Passed' && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>PASSED — Read-only account</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 uppercase">
                  Locked
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-slate-300">
                Evaluation challenge successfully passed on {campaign.passedDate ? format(new Date(campaign.passedDate), 'MMM d, yyyy') : 'Completed'} with +${Math.max(0, totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })} profit.
              </p>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                All trades and metrics are permanently preserved. This account is locked from further trading.
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCampaign(campaign.id);
                    navigate('/dashboard/trades');
                  }}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>View Trades</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateModalCampaign(campaign)}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>View Certificate</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. FUNDED ACCOUNT BANNER */}
          {isFunded && campaign.status === 'Active' && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-blue-700 dark:text-blue-300 block">Active Funded Trader</span>
                <span className="text-gray-500 dark:text-slate-400 text-[11px]">Eligible for Profit Payouts</span>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* 5b. REAL ACCOUNT BANNER */}
          {isReal && campaign.status === 'Active' && (
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-purple-700 dark:text-purple-300 block">Active Real Account</span>
                <span className="text-gray-500 dark:text-slate-400 text-[11px]">Personal Live Capital</span>
              </div>
              <span className={`text-sm font-black ${totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Profit Target Metric (Only for Phase 1 & 2 challenges) */}
          {isChallenge && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-slate-300 font-medium">
                  Profit Target {campaign.profitTargetPercent ? `(${campaign.profitTargetPercent}%)` : ''} (${(campaign.profitTarget || 0).toLocaleString()})
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {profitProgress.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-2 overflow-hidden border border-gray-200/30 dark:border-slate-800">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${profitProgress}%` }}></div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 text-right">
                {profitNeeded > 0 ? `$${profitNeeded.toLocaleString()} needed to pass` : 'Target Reached!'}
              </p>
            </div>
          )}

          {/* Daily Loss Limit */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-slate-300 font-medium">
                Daily Loss Limit {campaign.maxDailyDrawdownPercent ? `(${campaign.maxDailyDrawdownPercent}%)` : ''} (${(campaign.maxDailyDrawdown || 0).toLocaleString()})
              </span>
              <span className={`font-bold ${dailyLossProgress > 50 ? 'text-rose-500' : 'text-gray-700 dark:text-slate-300'}`}>
                {dailyLossProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-2 overflow-hidden border border-gray-200/30 dark:border-slate-800">
              <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, dailyLossProgress)}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 text-right">
              ${Math.max(0, dailyLimitRemaining).toLocaleString()} buffer remaining
            </p>
          </div>

          {/* Max Loss Limit */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-slate-300 font-medium">
                Max Drawdown {campaign.maxDrawdownPercent ? `(${campaign.maxDrawdownPercent}%)` : ''} (${(campaign.maxDrawdown || 0).toLocaleString()})
              </span>
              <span className={`font-bold ${maxLossProgress > 50 ? 'text-rose-500' : 'text-gray-700 dark:text-slate-300'}`}>
                {maxLossProgress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-[#182030] rounded-full h-2 overflow-hidden border border-gray-200/30 dark:border-slate-800">
              <div className="bg-rose-500 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, maxLossProgress)}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-slate-400 mt-1 text-right">
              ${Math.max(0, maxLimitRemaining).toLocaleString()} max buffer remaining
            </p>
          </div>
        </CardContent>
      </Card>

      <AdvancePhaseModal 
        isOpen={isAdvanceModalOpen} 
        onClose={() => setIsAdvanceModalOpen(false)} 
        campaign={campaign} 
      />

      <AddCampaignModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </>
  );
}
